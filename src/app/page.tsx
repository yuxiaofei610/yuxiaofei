import Link from "next/link";
import { getHotBoards } from "@/lib/hot";
import { listContent } from "@/lib/adapters";
import { recommend } from "@/lib/recommendation";
import HotBoardList from "@/components/HotBoard";
import FeaturedCard from "@/components/FeaturedCard";
import { CategorySection } from "@/components/HomeContent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 首屏 SSR 直出：热榜 + 精选 + 电影/电视剧首批（防手机白屏）；其余分类客户端懒加载。
  const [boards, movie, tv] = await Promise.all([
    getHotBoards().catch(() => []),
    listContent("movie", "hot", 1, 8, false).catch(() => []),
    listContent("tv", "hot", 1, 8, false).catch(() => []),
  ]);

  // 今日精选：复用推荐引擎生成「为什么推荐」理由（冷启动走高口碑/人气文案）。
  let featured = movie[0] || tv[0] || null;
  try {
    const rec = await Promise.race([
      recommend({ userId: null, contentType: "movie", count: 1, source: "home_featured" }),
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
    ]);
    if (rec?.items?.length) featured = rec.items[0];
  } catch {
    /* 推荐引擎超时则用热门电影兜底，不阻塞首页 */
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      {/* 今日热榜模块（最高优先级） */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">🔥 今日热榜</h2>
          <Link href="/hot" className="text-sm text-brand hover:underline">
            查看完整热榜 ›
          </Link>
        </div>
        <HotBoardList boards={boards.slice(0, 5)} />
      </section>

      {/* 今日精选推荐 */}
      {featured && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-black">⭐ 今日精选推荐</h2>
          <FeaturedCard item={featured} />
        </section>
      )}

      {/* 内容推荐区域 */}
      <CategorySection type="movie" label="电影" initial={movie} />
      <CategorySection type="tv" label="电视剧" initial={tv} />
      <CategorySection type="anime" label="动漫" />
      <CategorySection type="variety" label="综艺" />
      <CategorySection type="documentary" label="纪录片" />
      <CategorySection type="music" label="音乐" />
      <CategorySection type="single_player_game" label="游戏" />
    </main>
  );
}
