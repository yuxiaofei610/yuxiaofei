"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { NormalizedContent } from "@/lib/types";
import { useBehavior } from "./useBehavior";
import { useDetailModal } from "./DetailModalProvider";
import CoverImage from "./CoverImage";
import { showToast } from "./toast";

export default function FeaturedCard({ item }: { item: NormalizedContent }) {
  const { open } = useDetailModal();
  const { act } = useBehavior();
  const detailHref = `/detail/${item.contentType}/${encodeURIComponent(item.id)}`;
  const openDetail = (e: MouseEvent) => {
    e.preventDefault();
    open(item);
  };
  const [watched, setWatched] = useState(false);
  const reasons = item.recommendReasons || [];
  const genres = item.genres.length ? item.genres : item.tags;
  const isGame = item.contentType.includes("game");
  const watchLabel = item.contentType === "music" ? "已听" : isGame ? "已玩" : "已看";

  const toggleWatch = async () => {
    const r = await act(item.contentType, item.id, (isGame ? "played" : "watched") as any);
    if (r) {
      setWatched(r.added);
      showToast(r.added ? `已记录${watchLabel}` : `已取消${watchLabel}`, "success");
    }
  };

  return (
    <div className="card relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-bg-card to-bg-soft p-5 md:flex-row md:items-center">
      <Link href={detailHref} onClick={openDetail} className="relative mx-auto block w-32 shrink-0 overflow-hidden rounded-2xl shadow-lg md:w-44">
        <CoverImage c={item} className="aspect-[2/3] w-full" />
        {item.rating != null && (
          <span className="absolute right-2 top-2 rounded bg-black/75 px-2 py-0.5 text-xs font-bold text-yellow-400 shadow">
            ⭐ {item.rating.toFixed(1)}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {genres.slice(0, 3).map((g, i) => (
            <span key={i} className="chip">
              {g}
            </span>
          ))}
          {item.releaseDate && <span>· {item.releaseDate.slice(0, 4)}</span>}
        </div>

        <Link href={detailHref} onClick={openDetail} className="line-clamp-1 text-xl font-black hover:text-brand md:text-2xl">
          {item.title}
        </Link>
        {item.originalTitle && item.originalTitle !== item.title && (
          <div className="line-clamp-1 text-sm text-muted">{item.originalTitle}</div>
        )}

        {item.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted/90">{item.description}</p>
        )}

        {reasons.length > 0 && (
          <div className="mt-1 rounded-xl border border-brand/30 bg-brand/10 p-2.5">
            <div className="text-xs font-bold text-brand">💡 推荐理由</div>
            <p className="mt-0.5 text-sm">{reasons[0]}</p>
          </div>
        )}

        <div className="mt-1 flex flex-wrap gap-2">
          <button onClick={openDetail} className="btn btn-brand">
            查看详情
          </button>
          <button onClick={toggleWatch} className={`btn ${watched ? "btn-brand" : "btn-outline"}`}>
            {watchLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
