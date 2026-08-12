import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

// 图片代理：绕过豆瓣防盗链（418）以及 HTTP 混合内容问题。
// 浏览器直接请求同域 /api/proxy-image?url=...，服务端带 Referer/UA 去拉原图并缓存。
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("missing url", { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        Referer: "https://m.douban.com/",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return new NextResponse("upstream error", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const cacheControl = res.headers.get("cache-control");
    const buffer = await res.arrayBuffer();

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", cacheControl || "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");

    return new NextResponse(buffer, { headers });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
