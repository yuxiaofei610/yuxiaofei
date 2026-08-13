"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { NormalizedContent, CONTENT_TYPE_LABELS } from "@/lib/types";
import { useBehavior } from "./useBehavior";
import { showToast } from "./toast";
import { useDetailModal } from "./DetailModalProvider";
import CoverImage from "./CoverImage";

export default function ContentCard({ c, onAction }: { c: NormalizedContent; onAction?: () => void }) {
  const { act } = useBehavior();
  const { open } = useDetailModal();
  const detailHref = `/detail/${c.contentType}/${encodeURIComponent(c.id)}`;
  // 保留 href 供爬虫/直链使用，但点击时改为弹窗展示
  const openDetail = (e: MouseEvent) => {
    e.preventDefault();
    open(c);
  };
  const isGame = c.contentType === "mobile_game" || c.contentType === "online_game" || c.contentType === "single_player_game";
  const watchLabel = c.contentType === "music" ? "已听" : isGame ? "已玩" : "已看";
  const watchAction = isGame ? "played" : "watched";

  const [watched, setWatched] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const toggleWatch = async () => {
    const r = await act(c.contentType, c.id, watchAction as any);
    if (r) { setWatched(r.added); showToast(r.added ? `已记录${watchLabel}` : `已取消${watchLabel}`, "success"); onAction?.(); }
  };

  const primaryGenre = c.genres[0] || c.tags[0] || "";
  const showYear = c.releaseDate ? c.releaseDate.slice(0, 4) : "";

  return (
    <div className="card group flex w-[160px] shrink-0 flex-col sm:w-[180px]">
      <Link href={detailHref} onClick={openDetail} className="relative block aspect-[2/3] w-full overflow-hidden">
        <CoverImage c={c} className="transition-transform duration-500 group-hover:scale-105" />
        {c.isMock && (
          <span className="absolute left-1 top-1 rounded bg-yellow-500/90 px-1.5 py-0.5 text-[10px] font-bold text-black">MOCK</span>
        )}
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

        {c.originalTitle && c.originalTitle !== c.title && (
          <div className="line-clamp-1 text-[11px] text-muted" title={c.originalTitle}>
            {c.originalTitle}{showYear ? ` · ${showYear}` : ""}
          </div>
        )}

        {c.director && (
          <div className="line-clamp-1 text-[11px] text-muted">导演 · {c.director}</div>
        )}

        {c.description && (
          <div className="flex flex-col gap-0.5">
            <p className={`text-[11px] leading-snug text-muted/90 ${expanded ? "" : "line-clamp-2"}`}>{c.description}</p>
            {c.description.length > 42 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="self-start text-[11px] font-medium text-brand hover:underline"
              >
                {expanded ? "收起" : "展开 ›"}
              </button>
            )}
          </div>
        )}

        {primaryGenre && <span className="chip w-fit">{primaryGenre}</span>}

        {c.recommendReasons && c.recommendReasons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.recommendReasons.slice(0, 3).map((r, i) => (
              <span key={i} className="rounded border border-brand/30 bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                {r}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-1 pt-1">
          <button onClick={openDetail} className="btn btn-ghost flex-1">详情</button>
          <button onClick={toggleWatch} className={`btn flex-1 ${watched ? "btn-brand" : "btn-outline"}`}>{watchLabel}</button>
        </div>
      </div>
    </div>
  );
}
