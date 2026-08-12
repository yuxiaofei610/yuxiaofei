"use client";

import { useState } from "react";
import { NormalizedContent } from "@/lib/types";

export default function DetailCover({ content }: { content: NormalizedContent }) {
  const [err, setErr] = useState(false);
  if (!content.coverImage || err) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-hover to-bg-soft text-6xl font-black text-white/20">
        {content.title.slice(0, 1)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={content.coverImage}
      alt={content.title}
      referrerPolicy="no-referrer"
      onError={() => setErr(true)}
      className="h-full w-full object-cover"
    />
  );
}
