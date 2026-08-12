"use client";

import { useEffect, useState } from "react";
import { NormalizedContent } from "@/lib/types";
import { ExternalResourceLink } from "@/lib/external";
import CopyButton from "./CopyButton";
import { useBehavior } from "./useBehavior";
import { showToast } from "./toast";

const RES_LABEL: Record<string, string> = {
  bilibili: "Bilibili",
  cloud_drive: "网盘",
  anime_resource: "动漫资源",
  qq_music: "QQ音乐",
  official: "官网",
  steam: "Steam",
  app_store: "App Store",
  google_play: "Google Play",
  epic: "Epic",
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
};

export default function DetailActions({ content, external }: { content: NormalizedContent; external: ExternalResourceLink[] }) {
  const { act } = useBehavior();
  const isGame = content.contentType === "mobile_game" || content.contentType === "online_game" || content.contentType === "single_player_game";
  const watchLabel = content.contentType === "music" ? "已听" : isGame ? "已玩" : "已看";
  const watchAction = isGame ? "played" : "watched";

  const [watched, setWatched] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/behavior?list=${isGame ? "played" : "watched"}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch("/api/behavior?list=likes").then((r) => r.json()).catch(() => ({ items: [] })),
      fetch("/api/behavior?list=dislikes").then((r) => r.json()).catch(() => ({ items: [] })),
    ]).then(([w, l, d]) => {
      const wIds = (w.items || []).map((x: NormalizedContent) => x.id);
      const lIds = (l.items || []).map((x: NormalizedContent) => x.id);
      const dIds = (d.items || []).map((x: NormalizedContent) => x.id);
      if (wIds.includes(content.id)) setWatched(true);
      if (lIds.includes(content.id)) setLiked(true);
      if (dIds.includes(content.id)) setDisliked(true);
    });
  }, [content.id, isGame]);

  const toggleWatch = async () => {
    const r = await act(content.contentType, content.id, watchAction as any);
    if (r) { setWatched(r.added); showToast(r.added ? `已记录${watchLabel}` : `已取消${watchLabel}`, "success"); }
  };
  const toggleLike = async () => {
    const r = await act(content.contentType, content.id, "like");
    if (r) { setLiked(r.added); if (r.added) setDisliked(false); showToast(r.added ? "已喜欢" : "已取消喜欢", "success"); }
  };
  const toggleDislike = async () => {
    const r = await act(content.contentType, content.id, "dislike");
    if (r) { setDisliked(r.added); if (r.added) setLiked(false); showToast(r.added ? "已标记不喜欢" : "已取消", "success"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={toggleWatch} className={`btn ${watched ? "btn-brand" : "btn-outline"}`}>{watchLabel}</button>
        <button onClick={toggleLike} className={`btn ${liked ? "btn-brand" : "btn-outline"}`}>喜欢</button>
        <button onClick={toggleDislike} className={`btn ${disliked ? "bg-red-500/80 text-white" : "btn-outline"}`}>不喜欢</button>
        <CopyButton text={content.title} className="btn btn-outline" />
      </div>

      {external.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-white">外部资源入口</p>
          <div className="flex flex-wrap gap-2">
            {external.map((e) => (
              <a key={e.resourceType + e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                {RES_LABEL[e.resourceType] || e.title} ↗
              </a>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted">第三方平台链接，按名称跳转搜索/首页，不伪造具体资源。</p>
        </div>
      )}
    </div>
  );
}
