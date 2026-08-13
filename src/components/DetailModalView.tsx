"use client";

import { useEffect, useMemo, useState } from "react";
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
    fetch(`/api/detail?type=${encodeURIComponent(content.contentType)}&id=${encodeURIComponent(content.id)}`)
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
  const highlights = reasons.length > 0 ? reasons : fullContent.genres;
  const whyWatch = useMemo(() => {
    if (reasons.length > 0) return reasons[0];
    if (fullContent.description) {
      return fullContent.description.slice(0, 80) + (fullContent.description.length > 80 ? "…" : "");
    }
    return "这部作品值得一看。";
  }, [reasons, fullContent.description]);

  return (
    <div className="card relative overflow-hidden rounded-2xl">
      {/* 关闭按钮：有 onClose 走弹窗关闭，否则（独立页面）跳回首页 */}
      {onClose ? (
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 transition hover:bg-black/60"
        >
          ✕
        </button>
      ) : (
        <Link
          href="/"
          aria-label="返回"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 transition hover:bg-black/60"
        >
          ✕
        </Link>
      )}

      <div className="p-5 sm:p-6">
        {/* 头部：封面 + 标题/元信息 */}
        <div className="flex gap-4">
          <div className="relative h-[168px] w-[112px] shrink-0 overflow-hidden rounded-lg bg-bg-soft ring-1 ring-white/10">
            <CoverImage c={fullContent} />
            {fullContent.isMock && (
              <span className="absolute left-1 top-1 rounded bg-yellow-500/90 px-1.5 py-0.5 text-[10px] font-bold text-black">
                MOCK
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <h1 className="text-2xl font-black leading-tight md:text-3xl">{fullContent.title}</h1>
            {fullContent.originalTitle && fullContent.originalTitle !== fullContent.title && (
              <p className="mt-1 text-sm text-muted">{fullContent.originalTitle}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {fullContent.releaseDate && <span>📅 {fullContent.releaseDate}</span>}
              {fullContent.rating != null && <span className="text-yellow-400">⭐ 豆瓣 {fullContent.rating.toFixed(1)}</span>}
              {fullContent.imdbRating != null && <span className="text-sky-400">IMDb {fullContent.imdbRating.toFixed(1)}</span>}
              <span className="chip">{CONTENT_TYPE_LABELS[fullContent.contentType]}</span>
              {fullContent.director && <span>导演 · {fullContent.director}</span>}
            </div>
          </div>
        </div>

        {fullContent.genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {fullContent.genres.map((g) => (
              <span key={g} className="chip">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* 剧情梗概 */}
        <section className="mt-5">
          <h2 className="mb-1.5 text-sm font-bold text-white">剧情梗概</h2>
          {loadingDetail && !fullContent.description ? (
            <p className="text-sm text-muted">正在加载详情…</p>
          ) : (
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
              {fullContent.description || "（暂无简介）"}
            </p>
          )}
        </section>

        {/* 亮点 */}
        {highlights.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-1.5 text-sm font-bold text-white">亮点</h2>
            <ul className="space-y-1">
              {highlights.slice(0, 5).map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-white/80">
                  <span className="text-brand">·</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 为什么值得看 */}
        <section className="mt-4 rounded-xl border-l-2 border-brand bg-brand/5 px-3 py-2">
          <h2 className="mb-1 text-sm font-bold text-white">为什么值得看</h2>
          <p className="text-sm leading-relaxed text-white/85">{whyWatch}</p>
        </section>

        {/* 资源搜索 */}
        {external.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-1.5 text-sm font-bold text-white">资源搜索</h2>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={fullContent.title} className="btn btn-outline text-[12px]" />
              {external.map((e) => (
                <a
                  key={e.resourceType + e.url}
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost text-[12px]"
                >
                  {RES_LABEL[e.resourceType] || e.title} ↗
                </a>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted">第三方平台链接，按名称跳转搜索，不伪造具体资源。</p>
          </section>
        )}

        {/* 底部操作 */}
        <div className="mt-5 flex gap-2">
          <button onClick={toggleWatch} className={`btn flex-1 ${watched ? "btn-brand" : "btn-outline"}`}>
            {watched ? `已${watchLabel}` : `标记${watchLabel}`}
          </button>
          <button onClick={toggleLike} className={`btn flex-1 ${liked ? "btn-brand" : "btn-outline"}`}>
            {liked ? "已喜欢" : "喜欢"}
          </button>
          <button
            onClick={toggleDislike}
            className={`btn flex-1 ${disliked ? "bg-red-500/80 text-white" : "btn-outline"}`}
          >
            {disliked ? "已不喜欢" : "不喜欢"}
          </button>
        </div>
      </div>
    </div>
  );
}
