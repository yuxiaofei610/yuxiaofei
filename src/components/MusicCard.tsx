"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { NormalizedContent } from "@/lib/types";
import { useBehavior } from "./useBehavior";
import { showToast } from "./toast";
import { useDetailModal } from "./DetailModalProvider";
import CoverImage from "./CoverImage";

// 音乐专属卡片：方形专辑封面 + 歌手/专辑信息，区别于影视类 2:3 竖封面。
export default function MusicCard({ c, onAction }: { c: NormalizedContent; onAction?: () => void }) {
  const { act } = useBehavior();
  const { open } = useDetailModal();
  const detailHref = `/detail/${c.contentType}/${encodeURIComponent(c.id)}`;
  const openDetail = (e: MouseEvent) => {
    e.preventDefault();
    open(c);
  };

  const [listened, setListened] = useState(false);

  const toggleListen = async () => {
    const r = await act(c.contentType, c.id, "watched");
    if (r) {
      setListened(r.added);
      showToast(r.added ? "已记录已听" : "已取消已听", "success");
      onAction?.();
    }
  };

  const showYear = c.releaseDate ? c.releaseDate.slice(0, 4) : "";

  return (
    <div className="card group flex w-[160px] shrink-0 flex-col sm:w-[180px]">
      <Link href={detailHref} onClick={openDetail} className="relative block aspect-square w-full overflow-hidden">
        <CoverImage c={c} className="transition-transform duration-500 group-hover:scale-105" />
        {c.isMock && (
          <span className="absolute left-1 top-1 rounded bg-yellow-500/90 px-1.5 py-0.5 text-[10px] font-bold text-black">MOCK</span>
        )}
        <span className="absolute left-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-brand shadow">♪ 音乐</span>
        <div className="absolute right-1 top-1 flex flex-col items-end gap-1">
          {c.rating != null && (
            <span className="rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-yellow-400 shadow">豆瓣 {c.rating.toFixed(1)}</span>
          )}
          {c.imdbRating != null && (
            <span className="rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-sky-400 shadow">IMDb {c.imdbRating.toFixed(1)}</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <Link href={detailHref} onClick={openDetail} className="line-clamp-1 text-sm font-semibold hover:text-brand" title={c.title}>
          {c.title}
        </Link>

        {c.artist && (
          <div className="line-clamp-1 text-[11px] text-muted">歌手 · {c.artist}</div>
        )}

        {c.album && (
          <div className="line-clamp-1 text-[11px] text-muted">专辑 · {c.album}{showYear ? ` · ${showYear}` : ""}</div>
        )}

        {!c.artist && !c.album && c.originalTitle && c.originalTitle !== c.title && (
          <div className="line-clamp-1 text-[11px] text-muted" title={c.originalTitle}>{c.originalTitle}</div>
        )}

        {c.description && (
          <p className="line-clamp-2 text-[11px] leading-snug text-muted/90">{c.description}</p>
        )}

        {c.recommendReasons && c.recommendReasons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.recommendReasons.slice(0, 3).map((r, i) => (
              <span key={i} className="rounded border border-brand/30 bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand">{r}</span>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-1 pt-1">
          <button onClick={openDetail} className="btn btn-ghost flex-1">详情</button>
          <button onClick={toggleListen} className={`btn flex-1 ${listened ? "btn-brand" : "btn-outline"}`}>已听</button>
        </div>
      </div>
    </div>
  );
}
