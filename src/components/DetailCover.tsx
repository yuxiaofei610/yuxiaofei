"use client";

import { useMemo, useState } from "react";
import { NormalizedContent } from "@/lib/types";

function decodeOriginalCover(proxyUrl: string): string | null {
  try {
    const u = new URL(proxyUrl, "http://localhost");
    const raw = u.searchParams.get("url");
    return raw || null;
  } catch {
    return null;
  }
}

export default function DetailCover({ content }: { content: NormalizedContent }) {
  const [errProxy, setErrProxy] = useState(false);
  const [errDirect, setErrDirect] = useState(false);

  const directUrl = useMemo(() => {
    if (!content.coverImage) return null;
    return content.coverImage.startsWith("/api/proxy-image") ? decodeOriginalCover(content.coverImage) : null;
  }, [content.coverImage]);

  if (!content.coverImage || (errProxy && (!directUrl || errDirect))) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-hover to-bg-soft text-6xl font-black text-white/20">
        {content.title.slice(0, 1)}
      </div>
    );
  }

  if (!errProxy) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={content.coverImage}
        alt={content.title}
        referrerPolicy="no-referrer"
        onError={() => setErrProxy(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  // 代理失败时尝试直接请求豆瓣原图（部分网络环境下原图可用）
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={directUrl!}
      alt={content.title}
      referrerPolicy="no-referrer"
      onError={() => setErrDirect(true)}
      className="h-full w-full object-cover"
    />
  );
}
