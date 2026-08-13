import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/adapters";
import { buildExternalLinks, TOPHUB_LINK } from "@/lib/external";
import { CONTENT_TYPES, ContentType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") as ContentType | null;
  const id = sp.get("id");

  if (!type || !CONTENT_TYPES.includes(type) || !id) {
    return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
  }
  try {
    const fallback = {
      title: sp.get("title") || undefined,
      originalTitle: sp.get("originalTitle") || undefined,
      coverImage: sp.get("coverImage") || undefined,
      releaseDate: sp.get("releaseDate") || undefined,
      rating: sp.get("rating") ? parseFloat(sp.get("rating")!) : undefined,
      genres: sp.get("genres")?.split(",").filter(Boolean) || undefined,
    };
    const content = await getDetail(type, id, fallback);
    if (!content) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const external = buildExternalLinks(content);
    return NextResponse.json({ content, external, tophub: TOPHUB_LINK });
  } catch (e: any) {
    return NextResponse.json({ error: "DETAIL_FAILED", message: String(e?.message || e) }, { status: 502 });
  }
}
