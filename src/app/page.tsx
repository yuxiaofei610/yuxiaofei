import ContentRow from "@/components/ContentRow";
import InitialChoice from "@/components/InitialChoice";
import { prefetchContent } from "@/lib/adapters";
import { ContentType } from "@/lib/types";

const HOME_ROWS: { title: string; type: ContentType; category: string; subtitle: string }[] = [
  { title: "热门电影", type: "movie", category: "popular", subtitle: "豆瓣 / TMDB 中文" },
  { title: "热门电视剧", type: "tv", category: "popular", subtitle: "豆瓣 / TMDB 中文" },
  { title: "热门动漫", type: "anime", category: "popular", subtitle: "数据来自 Bangumi" },
  { title: "热门综艺", type: "variety", category: "popular", subtitle: "豆瓣 / TMDB 中文" },
  { title: "热门纪录片", type: "documentary", category: "popular", subtitle: "TMDB 中文" },
  { title: "热门音乐", type: "music", category: "popular", subtitle: "QQ音乐 / iTunes" },
];

export default async function HomePage() {
  // SSR 首屏直出：并发预取 6 类，单类 5 秒超时降级，避免手机端依赖客户端 JS 拉接口导致白屏。
  const results = await Promise.all(
    HOME_ROWS.map((r) => prefetchContent(r.type, r.category, 20))
  );
  return (
    <div>
      <InitialChoice />

      {/* Hero / 今日推荐 */}
      <section className="relative mt-2 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-bg-card via-bg-soft to-bg p-6 md:p-10">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-black tracking-tight md:text-4xl">
            发现你下一个<span className="text-brand"> 最爱 </span>
          </h1>
          <p className="mt-2 text-sm text-muted md:text-base">
            电影 · 电视剧 · 动漫 · 综艺 · 纪录片 · 音乐。标记已看已听，喜欢或不喜欢，推荐系统学习你的口味。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/preferences" className="btn btn-outline">我的偏好</a>
          </div>
        </div>
      </section>

      {HOME_ROWS.map((r, i) => (
        <ContentRow
          key={r.type}
          title={r.title}
          type={r.type}
          category={r.category}
          subtitle={r.subtitle}
          initialItems={results[i].items}
          initialIsMock={results[i].isMock}
        />
      ))}
    </div>
  );
}
