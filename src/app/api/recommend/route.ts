import { NextRequest, NextResponse } from "next/server";
import { recommend } from "@/lib/recommendation";
import { getCurrentUser } from "@/lib/auth";
import { CONTENT_TYPES, ContentType } from "@/lib/types";

// 推荐接口（含「换一批」：通过 page 翻页获取新候选 + 历史去重）
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") as ContentType | "all" | null;
  const source = sp.get("source") || "homepage";
  const page = parseInt(sp.get("page") || "1", 10) || 1;
  const count = Math.min(parseInt(sp.get("count") || "20", 10) || 20, 40);

  if (!type || (!CONTENT_TYPES.includes(type as ContentType) && type !== "all")) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }
  const user = await getCurrentUser();
  try {
    const result = await recommend({ userId: user?.id ?? null, contentType: type, count, source, page });
    return NextResponse.json({
      items: result.items,
      isColdStart: result.isColdStart,
      profile: result.profile,
      source: result.items[0]?.source ?? "unknown",
      isMock: result.items[0]?.isMock ?? false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "RECOMMEND_FAILED", message: String(e?.message || e) }, { status: 502 });
  }
}
