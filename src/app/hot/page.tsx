import Link from "next/link";
import { getHotBoards } from "@/lib/hot";
import HotBoardList from "@/components/HotBoard";

export const dynamic = "force-dynamic";

const EXTERNAL_LINKS = [
  { icon: "🔥", title: "TopHub 今日热榜", desc: "全网热点聚合（微博/知乎/百度/微信等）", url: "https://tophub.today/" },
  { icon: "▶️", title: "YouTube 热门", desc: "YouTube Trending（需科学上网）", url: "https://www.youtube.com/feed/trending" },
  { icon: "📺", title: "B站热门", desc: "哔哩哔哩全站热门视频", url: "https://www.bilibili.com/v/popular/all/" },
];

export default async function HotPage() {
  const boards = await getHotBoards();

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          🔥 今日热榜
        </h1>
        <p className="mt-1 text-sm text-muted">聚合豆瓣、Bangumi、QQ音乐、RAWG 与哔哩哔哩的实时热度，一键发现当下最值得看的内容。</p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        {EXTERNAL_LINKS.map((e) => (
          <a
            key={e.url}
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="card flex flex-col gap-1 rounded-2xl border border-line bg-bg-card p-4 transition hover:border-brand"
          >
            <span className="text-2xl">{e.icon}</span>
            <span className="font-bold">{e.title}</span>
            <span className="text-xs text-muted">{e.desc}</span>
          </a>
        ))}
      </section>

      <HotBoardList boards={boards} />

      <div className="mt-8 text-center">
        <Link href="/" className="btn btn-ghost text-sm">
          返回首页
        </Link>
      </div>
    </main>
  );
}
