import { NextRequest, NextResponse } from "next/server";
import { searchContent } from "@/lib/adapters";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CONTENT_TYPES, ContentType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const typeParam = sp.get("type") as ContentType | null;
  const type = typeParam && CONTENT_TYPES.includes(typeParam) ? typeParam : undefined;

  if (!q) return NextResponse.json({ items: [] });

  try {
    const items = await searchContent(q, type);
    const user = await getCurrentUser();
    if (user) {
      await prisma.searchHistory.create({ data: { userId: user.id, query: q } }).catch(() => {});
    } else {
      await prisma.searchHistory.create({ data: { userId: null, query: q } }).catch(() => {});
    }
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: "SEARCH_FAILED", message: String(e?.message || e) }, { status: 502 });
  }
}
