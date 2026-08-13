import { NextRequest, NextResponse } from "next/server";
import { listContent } from "@/lib/adapters";
import { CONTENT_TYPES, ContentType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") as ContentType | null;
  const category = sp.get("category") || "popular";
  const page = parseInt(sp.get("page") || "1", 10) || 1;
  const perPage = Math.min(parseInt(sp.get("perPage") || "20", 10) || 20, 40);
  const minRatingRaw = sp.get("minRating");
  const year = sp.get("year");
  const sort = sp.get("sort");

  if (!type || !CONTENT_TYPES.includes(type)) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }
  try {
    const items = await listContent(type, category, page, perPage, true, {
      minRating: minRatingRaw ? Number(minRatingRaw) : undefined,
      year: year || undefined,
      sort: (sort as "hot" | "rating" | "year") || undefined,
    });
    return NextResponse.json({ items, source: items[0]?.source ?? "unknown", isMock: items[0]?.isMock ?? false });
  } catch (e: any) {
    return NextResponse.json({ error: "FETCH_FAILED", message: String(e?.message || e) }, { status: 502 });
  }
}
