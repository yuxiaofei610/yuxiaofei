"use client";

import { useState } from "react";
import { NormalizedContent } from "@/lib/types";

function decodeOriginalCover(proxyUrl: string): string | null {
  try {
    const u = new URL(proxyUrl, "http://localhost");
    return u.searchParams.get("url");
  } catch {
    return null;
  }
}

// 列表卡片与详情弹窗共用的封面渲染：先用 /api/proxy-image 代理，失败回退原图直链，再失败显示首字占位。
export default function CoverImage({ c, className = "" }: { c: NormalizedContent; className?: string }) {
  const [errProxy, setErrProxy] = useState(false);
  const [errDirect, setErrDirect] = useState(false);
  const directUrl = c.coverImage?.startsWith("/api/proxy-image") ? decodeOriginalCover(c.coverImage) : null;

  if (!c.coverImage || (errProxy && (!directUrl || errDirect))) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-hover to-bg-soft text-3xl font-black text-white/30 ${className}`}
      >
        {c.title.slice(0, 1)}
      </div>
    );
  }

  const src = !errProxy ? c.coverImage : directUrl!;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={c.title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!errProxy) setErrProxy(true);
        else setErrDirect(true);
      }}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
