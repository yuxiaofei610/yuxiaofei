"use client";

import { useCallback, useEffect, useState } from "react";
import { NormalizedContent, CONTENT_TYPE_LABELS, ContentType } from "@/lib/types";
import ContentCard from "@/components/ContentCard";
import { showToast } from "@/components/toast";

type Tab = "watched" | "favorites" | "want_watch" | "ratings";

const TABS: { key: Tab; label: string; list: string }[] = [
  { key: "watched", label: "已看", list: "watched" },
  { key: "favorites", label: "收藏", list: "favorites" },
  { key: "want_watch", label: "想看", list: "want_watch" },
  { key: "ratings", label: "我的评分", list: "ratings" },
];

function StatBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card flex flex-col items-center rounded-2xl border border-line bg-bg-card p-4">
      <span className="text-2xl font-black text-brand">{value}</span>
      <span className="mt-1 text-xs text-muted">{label}</span>
    </div>
  );
}

export default function MePage() {
  const [tab, setTab] = useState<Tab>("watched");
  const [items, setItems] = useState<NormalizedContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cur = TABS.find((t) => t.key === tab)!;
      const res = await fetch(`/api/behavior?list=${cur.list}`);
      const data = await res.json();
      if (data.error === "NOT_LOGIN") {
        showToast("请先登录", "error");
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      showToast("加载失败", "error");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const loadStats = useCallback(async () => {
    try {
      const [w, f, ww, rt] = await Promise.all([
        fetch("/api/behavior?list=watched").then((r) => r.json()).catch(() => ({ items: [] })),
        fetch("/api/behavior?list=favorites").then((r) => r.json()).catch(() => ({ items: [] })),
        fetch("/api/behavior?list=want_watch").then((r) => r.json()).catch(() => ({ items: [] })),
        fetch("/api/behavior?list=ratings").then((r) => r.json()).catch(() => ({ items: [] })),
      ]);
      setStats({
        watched: (w.items || []).length,
        favorites: (f.items || []).length,
        wantWatch: (ww.items || []).length,
        ratings: (rt.items || []).length,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      <h1 className="mb-4 text-2xl font-black tracking-tight md:text-3xl">👤 我的</h1>

      {/* 观看统计 */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBlock label="已看" value={stats.watched ?? 0} />
        <StatBlock label="收藏" value={stats.favorites ?? 0} />
        <StatBlock label="想看" value={stats.wantWatch ?? 0} />
        <StatBlock label="我的评分" value={stats.ratings ?? 0} />
      </section>

      {/* Tab 切换 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              tab === t.key ? "bg-brand text-white" : "bg-bg-hover text-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-[300px] w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted">
          {tab === "watched" && "还没有已看记录，去首页发现内容并标记「已看」吧。"}
          {tab === "favorites" && "还没有收藏，在详情页点击「收藏」保存喜欢的内容。"}
          {tab === "want_watch" && "想看清单是空的，遇到感兴趣的内容点「想看」。"}
          {tab === "ratings" && "还没有评分，在详情页点亮星星吧。"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((c) => (
            <ContentCard key={c.id} c={c} onAction={load} />
          ))}
        </div>
      )}
    </main>
  );
}
