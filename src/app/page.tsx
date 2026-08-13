import ContentRow from "@/components/ContentRow";
import InitialChoice from "@/components/InitialChoice";
import LazyCategories from "@/components/LazyCategories";
import { prefetchContent } from "@/lib/adapters";
import { ContentType } from "@/lib/types";

// 首屏仅 SSR 直出电影 + 电视剧，减少首屏 DOM 体积（防手机白屏的同时控制 HTML 体积）。
// 其余分类（动漫/综艺/纪录片/音乐）由 LazyCategories 在用户点击「加载更多」后客户端懒加载。
const HOME_ROWS: { title: string; type: ContentType; category: string; subtitle: string }[] = [
  { title: "热门电影", type: "movie", category: "popular", subtitle: "豆瓣 / TMDB 中文" },
  { title: "热门电视剧", type: "tv", category: "popular", subtitle: "豆瓣 / TMDB 中文" },
];

export default async function HomePage() {
  // SSR 首屏直出：并发预取电影+电视剧两类，单类 5 秒超时降级，避免手机端依赖客户端 JS 拉接口导致白屏。
  const results = await Promise.all(
    HOME_ROWS.map((r) => prefetchContent(r.type, r.category, 20))
  );
  return (
    <div>
      <InitialChoice />

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

      <LazyCategories />
    </div>
  );
}
