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
];

const GAME_LINKS = [
  { href: "/games/mobile", label: "手游" },
  { href: "/games/online", label: "网游" },
  { href: "/games/single", label: "单机" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [q, setQ] = useState("");
  const [gameOpen, setGameOpen] = useState(false);

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

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="text-brand">悦荐</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {TOP_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={`rounded-lg px-3 py-1.5 text-sm ${isActive(l.href) ? "text-white bg-bg-hover" : "text-muted hover:text-white"}`}>
                {l.label}
              </Link>
            ))}
            <div className="relative" onMouseLeave={() => setGameOpen(false)}>
              <button onMouseEnter={() => setGameOpen(true)} className={`rounded-lg px-3 py-1.5 text-sm ${pathname.startsWith("/games") ? "text-white bg-bg-hover" : "text-muted hover:text-white"}`}>
                游戏 ▾
              </button>
              {gameOpen && (
                <div className="absolute left-0 top-full mt-1 w-32 rounded-lg border border-line bg-bg-soft p-1 shadow-xl">
                  {GAME_LINKS.map((g) => (
                    <Link key={g.href} href={g.href} className="block rounded-md px-3 py-1.5 text-sm text-muted hover:bg-bg-hover hover:text-white">
                      {g.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/watched" className={`rounded-lg px-3 py-1.5 text-sm ${isActive("/watched") ? "text-white bg-bg-hover" : "text-muted hover:text-white"}`}>已看</Link>
            <Link href="/played" className={`rounded-lg px-3 py-1.5 text-sm ${isActive("/played") ? "text-white bg-bg-hover" : "text-muted hover:text-white"}`}>已玩</Link>
            <Link href="/preferences" className={`rounded-lg px-3 py-1.5 text-sm ${isActive("/preferences") ? "text-white bg-bg-hover" : "text-muted hover:text-white"}`}>我的偏好</Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={submitSearch} className="hidden items-center md:flex">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="全局搜索…"
                className="w-40 rounded-lg border border-line bg-bg-soft px-3 py-1.5 text-sm outline-none focus:border-accent lg:w-56"
              />
            </form>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-muted sm:inline">{user.username}</span>
                <button onClick={onLogout} className="btn btn-ghost">登出</button>
              </div>
            ) : (
              <Link href="/login" className="btn btn-brand">登录</Link>
            )}
          </div>
        </div>
      </header>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-line bg-bg/95 backdrop-blur md:hidden">
        {[{ href: "/", label: "首页" }, { href: "/movie", label: "分类" }, { href: "/search", label: "搜索" }, { href: "/watched", label: "已看/玩" }, { href: "/preferences", label: "我的" }].map((i) => (
          <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(i.href) ? "text-brand" : "text-muted"}`}>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
