import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDetail } from "@/lib/adapters";
import { buildExternalLinks, TOPHUB_LINK } from "@/lib/external";
import { CONTENT_TYPES, CONTENT_TYPE_LABELS, ContentType } from "@/lib/types";
import DetailActions from "@/components/DetailActions";
import ContentRow from "@/components/ContentRow";

export async function generateMetadata({ params }: { params: { type: string; id: string } }): Promise<Metadata> {
  const type = params.type as ContentType;
  const id = decodeURIComponent(params.id);
  const c = await getDetail(type, id).catch(() => null);
  if (!c) return { title: "详情 · 悦荐" };
  return {
    title: `${c.title} · 悦荐`,
    description: c.description?.slice(0, 120) || `${c.title} 的详细介绍与推荐`,
    openGraph: { title: c.title, description: c.description?.slice(0, 120), images: c.coverImage ? [c.coverImage] : [] },
  };
}

export default async function DetailPage({ params }: { params: { type: string; id: string } }) {
  const type = params.type as ContentType;
  if (!CONTENT_TYPES.includes(type)) notFound();
  const id = decodeURIComponent(params.id);
  const content = await getDetail(type, id);
  if (!content) notFound();

  const external = buildExternalLinks(content);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": type === "music" ? "MusicRecording" : type.endsWith("game") ? "VideoGame" : "CreativeWork",
    name: content.title,
    description: content.description || "",
    image: content.coverImage || "",
    datePublished: content.releaseDate || "",
    aggregateRating: content.rating != null ? { "@type": "AggregateRating", ratingValue: content.rating } : undefined,
  };

  return (
    <div className="pt-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="card aspect-[2/3] w-full overflow-hidden md:w-[300px]">
          {content.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.coverImage} alt={content.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-hover to-bg-soft text-6xl font-black text-white/20">
              {content.title.slice(0, 1)}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black md:text-3xl">{content.title}</h1>
            {content.isMock && <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">MOCK</span>}
          </div>
          {content.originalTitle && <p className="text-sm text-muted">{content.originalTitle}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            {content.releaseDate && <span>📅 {content.releaseDate}</span>}
            {content.rating != null && <span className="text-yellow-400">⭐ {content.rating.toFixed(1)}</span>}
            {content.language && <span>🌐 {content.language}</span>}
            {content.country && <span>🌍 {content.country}</span>}
            <span className="chip">{CONTENT_TYPE_LABELS[content.contentType]}</span>
          </div>

          {content.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {content.genres.map((g) => <span key={g} className="chip">{g}</span>)}
            </div>
          )}
          {content.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {content.tags.map((t) => <span key={t} className="chip bg-accent/10 text-accent">{t}</span>)}
            </div>
          )}

          {(content.artist || content.developer) && (
            <div className="mt-3 text-sm text-muted">
              {content.artist && <p>艺术家：{content.artist}</p>}
              {content.album && <p>专辑：{content.album}</p>}
              {content.developer && <p>开发商：{content.developer}</p>}
              {content.publisher && <p>发行商：{content.publisher}</p>}
              {content.platforms && content.platforms.length > 0 && <p>平台：{content.platforms.join(" / ")}</p>}
            </div>
          )}

          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/80">{content.description || "（暂无简介）"}</p>

          <div className="mt-5">
            <DetailActions content={content} external={[...external, TOPHUB_LINK]} />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ContentRow title="相关推荐" type={content.contentType} category="popular" />
      </div>
    </div>
  );
}
