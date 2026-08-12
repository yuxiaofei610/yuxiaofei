"use client";

import Link from "next/link";
import { useState } from "react";
import { NormalizedContent, CONTENT_TYPE_LABELS } from "@/lib/types";
import { buildExternalLinks } from "@/lib/external";
import CopyButton from "./CopyButton";
import { useBehavior } from "./useBehavior";
import { showToast } from "./toast";

const RES_ICON: Record<string, string> = {
  bilibili: "Bilibili",
  cloud_drive: "网盘",
  anime_resource: "动漫资源",
  qq_music: "QQ音乐",
  official: "官网",
};

function Cover({ c }: { c: NormalizedContent }) {
  const [err, setErr] = useState(false);
  if (c.coverImage && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.coverImage} alt={c.title} loading="lazy" onError={() => setErr(true)} className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-hover to-bg-soft text-3xl font-black text-white/30">
      {c.title.slice(0, 1)}
    </div>
  );
}

export default function ContentCard({ c, onAction }: { c: NormalizedContent; onAction?: () => void }) {
  const { act } = useBehavior();
  const isGame = c.contentType === "mobile_game" || c.contentType === "online_game" || c.contentType === "single_player_game";
  const watchLabel = c.contentType === "music" ? "已听" : isGame ? "已玩" : "已看";
  const watchAction = isGame ? "played" : "watched";

  const [watched, setWatched] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const external = buildExternalLinks(c);

  const toggleWatch = async () => {
    const r = await act(c.contentType, c.id, watchAction as any);
    if (r) { setWatched(r.added); showToast(r.added ? `已记录${watchLabel}` : `已取消${watchLabel}`, "success"); onAction?.(); }
  };
  const toggleLike = async () => {
    const r = await act(c.contentType, c.id, "like");
    if (r) { setLiked(r.added); if (r.added) setDisliked(false); showToast(r.added ? "已喜欢" : "已取消喜欢", "success"); onAction?.(); }
  };
  const toggleDislike = async () => {
    const r = await act(c.contentType, c.id, "dislike");
    if (r) { setDisliked(r.added); if (r.added) setLiked(false); showToast(r.added ? "已标记不喜欢" : "已取消", "success"); onAction?.(); }
  };

  const meta = [c.releaseDate, CONTENT_TYPE_LABELS[c.contentType]].filter(Boolean).join(" · ");
  const primaryGenre = c.genres[0] || c.tags[0] || "";

  return (
    <div className="card group flex w-[160px] shrink-0 flex-col sm:w-[180px]">
      <Link href={`/detail/${c.contentType}/${encodeURIComponent(c.id)}`} className="relative block aspect-[2/3] w-full overflow-hidden">
        <Cover c={c} />
        {c.isMock && (
          <span className="absolute left-1 top-1 rounded bg-yellow-500/90 px-1.5 py-0.5 text-[10px] font-bold text-black">MOCK</span>
        )}
        {c.rating != null && (
          <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-yellow-400">⭐ {c.rating.toFixed(1)}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <Link href={`/detail/${c.contentType}/${encodeURIComponent(c.id)}`} className="line-clamp-1 text-sm font-semibold hover:text-brand" title={c.title}>
          {c.title}
        </Link>
        <div className="flex items-center gap-1 text-[11px] text-muted">
          <span className="line-clamp-1">{meta}</span>
        </div>
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

        <div className="mt-auto flex flex-col gap-1 pt-1">
          <div className="flex gap-1">
            <Link href={`/detail/${c.contentType}/${encodeURIComponent(c.id)}`} className="btn btn-ghost flex-1">详情</Link>
            <button onClick={toggleWatch} className={`btn flex-1 ${watched ? "btn-brand" : "btn-outline"}`}>{watchLabel}</button>
          </div>
          <div className="flex gap-1">
            <button onClick={toggleLike} className={`btn flex-1 ${liked ? "btn-brand" : "btn-outline"}`}>喜欢</button>
            <button onClick={toggleDislike} className={`btn flex-1 ${disliked ? "bg-red-500/80 text-white" : "btn-outline"}`}>不喜欢</button>
          </div>
          <CopyButton text={c.title} className="btn btn-outline w-full" />

          {external.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {external.map((e) => (
                <a key={e.resourceType + e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-[11px]">
                  {RES_ICON[e.resourceType] || e.title}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
