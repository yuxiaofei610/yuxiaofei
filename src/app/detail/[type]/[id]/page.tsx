import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDetail } from "@/lib/adapters";
import { CONTENT_TYPES, ContentType } from "@/lib/types";
import DetailModalView from "@/components/DetailModalView";
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

      <div className="flex min-h-[60vh] items-start justify-center py-6">
        <div className="w-full max-w-2xl">
          <DetailModalView content={content} />
        </div>
      </div>

      <div className="mt-8">
        <ContentRow title="相关推荐" type={content.contentType} category="popular" />
      </div>
    </div>
  );
}
