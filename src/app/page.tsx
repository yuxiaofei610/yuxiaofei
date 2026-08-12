import ContentRow from "@/components/ContentRow";
import InitialChoice from "@/components/InitialChoice";

export default function HomePage() {
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
            <a href="https://tophub.today/" target="_blank" rel="noopener noreferrer" className="btn btn-brand">
              查看今日热榜 ↗
            </a>
            <a href="/anime" className="btn btn-outline">热门动漫（真实数据）</a>
            <a href="/preferences" className="btn btn-outline">我的偏好</a>
          </div>
        </div>
      </section>

      {/* 为你推荐（个性化，混合全类型） */}
      <ContentRow title="为你推荐" type="all" mode="recommend" source="homepage" count={20} subtitle="基于你的兴趣画像混合推荐" />

      {/* 今日热榜外部入口 */}
      <section className="my-4 rounded-xl border border-line bg-bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">今日热榜</h2>
            <p className="text-xs text-muted">外部实时热榜入口（TopHub），点击跳转查看全网热点。</p>
          </div>
          <a href="https://tophub.today/" target="_blank" rel="noopener noreferrer" className="btn btn-brand">查看今日热榜 ↗</a>
        </div>
      </section>

      <ContentRow title="热门电影" type="movie" category="popular" subtitle="豆瓣 / TMDB 中文" />
      <ContentRow title="热门电视剧" type="tv" category="popular" subtitle="豆瓣 / TMDB 中文" />
      <ContentRow title="热门动漫" type="anime" category="popular" subtitle="数据来自 Bangumi" />
      <ContentRow title="热门综艺" type="variety" category="popular" subtitle="豆瓣 / TMDB 中文" />
      <ContentRow title="热门纪录片" type="documentary" category="popular" subtitle="TMDB 中文" />
      <ContentRow title="热门音乐" type="music" category="popular" subtitle="QQ音乐 / iTunes" />

      <ContentRow title="猜你喜欢" type="all" mode="recommend" source="guess" count={20} subtitle="换一批发现更多" />
    </div>
  );
}
