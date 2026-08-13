"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TOP_LINKS = [
  { href: "/", label: "首页" },
  { href: "/movie", label: "电影" },
  { href: "/tv", label: "电视剧" },
  { href: "/anime", label: "动漫" },
  { href: "/variety", label: "综艺" },
  { href: "/documentary", label: "纪录片" },
  { href: "/music", label: "音乐" },
  { href: "/game", label: "游戏" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/user").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
            <span className="text-brand">悦荐</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {TOP_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`btn whitespace-nowrap text-xs ${isActive(l.href) ? "btn-brand ring-2 ring-white/40" : "btn-ghost"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={submitSearch} className="hidden items-center md:flex">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索电影 / 剧 / 动漫 / 音乐 / 游戏…"
                className="w-40 rounded-lg border border-line bg-bg-soft px-3 py-1.5 text-sm outline-none focus:border-accent lg:w-56"
              />
            </form>
            <Link href="/me" className="btn btn-ghost whitespace-nowrap text-xs">
              收藏
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/me" className="btn btn-brand whitespace-nowrap text-xs">
                  我的
                </Link>
                <button onClick={onLogout} className="btn btn-ghost whitespace-nowrap text-xs">
                  登出
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn btn-brand whitespace-nowrap text-xs">
                登录
              </Link>
            )}
          </div>
        </div>

        {/* 移动端分类横向滚动 */}
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
          {TOP_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${isActive(l.href) ? "bg-brand text-white" : "bg-bg-soft text-muted"}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </header>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-3 border-t border-line bg-bg/95 backdrop-blur md:hidden">
        {[
          { href: "/", label: "首页" },
          { href: "/movie", label: "分类" },
          { href: "/me", label: "我的" },
        ].map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(i.href) ? "text-brand" : "text-muted"}`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
