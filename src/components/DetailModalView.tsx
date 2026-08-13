"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NormalizedContent, CONTENT_TYPE_LABELS } from "@/lib/types";
import { buildExternalLinks, ExternalResourceLink } from "@/lib/external";
import CopyButton from "./CopyButton";
import CoverImage from "./CoverImage";
import { useBehavior } from "./useBehavior";
import { showToast } from "./toast";

// 资源搜索按钮只保留这几类（与需求文档允许的外部资源一致）
const RES_ORDER = ["bilibili", "cloud_drive", "anime_resource", "qq_music", "official"];
const RES_LABEL: Record<string, string> = {
  bilibili: "B站",
  cloud_drive: "网盘",
  anime_resource: "动漫资源",
  qq_music: "QQ音乐",
  official: "官网",
};

function mergeDetail(base: NormalizedContent, detail?: NormalizedContent | null): NormalizedContent {
  if (!detail) return base;
  // 详情接口若只能返回 MOCK 兜底，保留列表页的真实数据，不要覆盖成“无法还原详情”
  if (detail.isMock) return base;
  return {
    ...detail,
    id: base.id,
    contentType: base.contentType,
    // 列表页通常已有更及时的封面/评分，详情接口缺这些字段时回退到列表数据
    coverImage: detail.coverImage ?? base.coverImage,
    rating: detail.rating ?? base.rating,
    imdbRating: detail.imdbRating ?? base.imdbRating,
    // 数组类字段：详情接口有则覆盖，否则保留列表数据
    genres: detail.genres?.length ? detail.genres : base.genres,
    tags: detail.tags?.length ? detail.tags : base.tags,
    recommendReasons: detail.recommendReasons?.length ? detail.recommendReasons : base.recommendReasons,
  };
}

export default function DetailModalView({ content, onClose }: { content: NormalizedContent; onClose?: () => void }) {
  const { act } = useBehavior();

  const [fullContent, setFullContent] = useState<NormalizedContent>(content);
  const [external, setExternal] = useState<ExternalResourceLink[]>(() =>
    buildExternalLinks(content).filter((e) => RES_ORDER.includes(e.resourceType))
  );
  const [loadingDetail, setLoadingDetail] = useState(true);

  // 弹窗打开后异步补全详情（列表数据通常没有 description / director / recommendReasons）
  useEffect(() => {
    let cancelled = false;
    setLoadingDetail(true);
    const params = new URLSearchParams();
    params.set("type", content.contentType);
    params.set("id", content.id);
    if (content.title) params.set("title", content.title);
    if (content.originalTitle) params.set("originalTitle", content.originalTitle);
    if (content.coverImage) params.set("coverImage", content.coverImage);
    if (content.releaseDate) params.set("releaseDate", content.releaseDate);
    if (content.rating != null) params.set("rating", String(content.rating));
    if (content.genres?.length) params.set("genres", content.genres.join(","));
    if (content.description) params.set("description", content.description);
    fetch(`/api/detail?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.content) return;
        setFullContent((prev) => mergeDetail(prev, data.content));
        if (data.external) {
          setExternal(data.external.filter((e: ExternalResourceLink) => RES_ORDER.includes(e.resourceType)));
        }
      })
      .catch(() => {
        // 详情接口失败仍可用列表数据继续展示
      })
      .finally(() => setLoadingDetail(false));
    return () => {
      cancelled = true;
    };
  }, [content.contentType, content.id]);

  const isGame =
    fullContent.contentType === "mobile_game" ||
    fullContent.contentType === "online_game" ||
    fullContent.contentType === "single_player_game";
  const watchLabel = fullContent.contentType === "music" ? "已听" : isGame ? "已玩" : "已看";
  const watchAction = isGame ? "played" : "watched";

  const [watched, setWatched] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/behavior?list=${isGame ? "played" : "watched"}`)
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch("/api/behavior?list=likes")
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch("/api/behavior?list=dislikes")
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
    ]).then(([w, l, d]) => {
      const wIds = (w.items || []).map((x: NormalizedContent) => x.id);
      const lIds = (l.items || []).map((x: NormalizedContent) => x.id);
      const dIds = (d.items || []).map((x: NormalizedContent) => x.id);
      if (wIds.includes(fullContent.id)) setWatched(true);
      if (lIds.includes(fullContent.id)) setLiked(true);
      if (dIds.includes(fullContent.id)) setDisliked(true);
    });
  }, [fullContent.id, isGame]);

  const toggleWatch = async () => {
    const r = await act(fullContent.contentType, fullContent.id, watchAction as any);
    if (r) {
      setWatched(r.added);
      showToast(r.added ? `已记录${watchLabel}` : `已取消${watchLabel}`, "success");
    }
  };
  const toggleLike = async () => {
    const r = await act(fullContent.contentType, fullContent.id, "like");
    if (r) {
      setLiked(r.added);
      if (r.added) setDisliked(false);
      showToast(r.added ? "已喜欢" : "已取消喜欢", "success");
    }
  };
  const toggleDislike = async () => {
    const r = await act(fullContent.contentType, fullContent.id, "dislike");
    if (r) {
      setDisliked(r.added);
      if (r.added) setLiked(false);
      showToast(r.added ? "已标记不喜欢" : "已取消", "success");
    }
  };

  const reasons = fullContent.recommendReasons || [];
  const hasDescription = Boolean(fullContent.description);

  return (
    <div className="card relative overflow-hidden rounded-2xl">
      {/* 关闭按钮：有 onClose 走弹窗关闭，否则（独立页面）跳回首页 */}
      {onClose ? (
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/80 transition hover:bg-black/60"
        >
          ✕
        </button>
      ) : (
        <Link
          href="/"
          aria-label="返回"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/80 transition hover:bg-black/60"
        >
          ✕
        </Link>
      )}

      <div className="p-4 sm:p-5">
        {/* 头部：封面 + 标题/元信息 */}
        <div className="flex gap-3">
          <div className="relative h-[144px] w-[96px] shrink-0 overflow-hidden rounded-md bg-bg-soft ring-1 ring-white/10">
            <CoverImage c={fullContent} />
            {fullContent.isMock && (
              <span className="absolute left-1 top-1 rounded bg-yellow-500/90 px-1 py-0.5 text-[9px] font-bold text-black">
                MOCK
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 pr-7">
            <h1 className="text-xl font-black leading-tight sm:text-2xl">{fullContent.title}</h1>
            {fullContent.originalTitle && fullContent.originalTitle !== fullContent.title && (
              <p className="text-xs text-muted sm:text-sm">{fullContent.originalTitle}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted sm:text-sm">
              {fullContent.releaseDate && <span>{fullContent.releaseDate}</span>}
              {fullContent.rating != null && <span className="text-yellow-400">⭐ {fullContent.rating.toFixed(1)}</span>}
              {fullContent.imdbRating != null && <span className="text-sky-400">IMDb {fullContent.imdbRating.toFixed(1)}</span>}
              <span className="chip text-[10px] sm:text-xs">{CONTENT_TYPE_LABELS[fullContent.contentType]}</span>
              {fullContent.director && <span className="truncate">{fullContent.director}</span>}
            </div>
            {fullContent.genres.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fullContent.genres.map((g) => (
                  <span key={g} className="chip text-[10px] sm:text-xs">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 剧情梗概 */}
        {loadingDetail ? (
          <p className="mt-3 text-xs text-muted">正在加载详情…</p>
        ) : hasDescription ? (
          <section className="mt-3">
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/85">{fullContent.description}</p>
          </section>
        ) : null}

        {/* 亮点：仅在有真实推荐理由时显示，避免与题材标签重复 */}
        {reasons.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-white/60">亮点</h2>
            <ul className="space-y-0.5">
              {reasons.slice(0, 5).map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-white/80">
                  <span className="text-brand">·</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 为什么值得看：仅在有真实推荐理由时显示 */}
        {reasons.length > 0 && (
          <section className="mt-3 rounded-lg border-l-2 border-brand bg-brand/5 px-3 py-2">
            <p className="text-sm leading-relaxed text-white/85">{reasons[0]}</p>
          </section>
        )}

        {/* 资源搜索 */}
        {external.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-white/60">资源搜索</h2>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={fullContent.title} className="btn btn-outline text-[11px]" />
              <a
                href="https://www.lvsc168.com/index.php"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-brand text-[11px]"
              >
                在线播放 ↗
              </a>
              {external.map((e) => (
                <a
                  key={e.resourceType + e.url}
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost text-[11px]"
                >
                  {RES_LABEL[e.resourceType] || e.title} ↗
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 底部操作 */}
        <div className="mt-4 flex gap-2">
          <button onClick={toggleWatch} className={`btn flex-1 text-sm ${watched ? "btn-brand" : "btn-outline"}`}>
            {watched ? `已${watchLabel}` : `标记${watchLabel}`}
          </button>
          <button onClick={toggleLike} className={`btn flex-1 text-sm ${liked ? "btn-brand" : "btn-outline"}`}>
            {liked ? "已喜欢" : "喜欢"}
          </button>
          <button
            onClick={toggleDislike}
            className={`btn flex-1 text-sm ${disliked ? "bg-red-500/80 text-white" : "btn-outline"}`}
          >
            {disliked ? "已不喜欢" : "不喜欢"}
          </button>
        </div>
      </div>
    </div>
  );
}
