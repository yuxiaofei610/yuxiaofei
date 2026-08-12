"use client";

import { useCallback, useEffect, useState } from "react";
import { NormalizedContent, CONTENT_TYPE_LABELS, ContentType } from "@/lib/types";
import ContentCard from "./ContentCard";
import { showToast } from "./toast";

export default function HistoryList({ listType, filters, title }: { listType: "watched" | "played"; filters: ContentType[]; title: string }) {
  const [items, setItems] = useState<NormalizedContent[]>([]);
  const [activeType, setActiveType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = activeType === "all" ? "" : `&type=${activeType}`;
      const res = await fetch(`/api/behavior?list=${listType}${typeParam}`);
      const data = await res.json();
      if (data.error === "NOT_LOGIN") { showToast("请先登录", "error"); setItems([]); return; }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      showToast("加载失败", "error");
    } finally {
      setLoading(false);
    }
  }, [listType, activeType]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="pt-2">
      <h1 className="mb-3 text-xl font-bold">{title}</h1>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setActiveType("all")} className={`rounded-full px-3 py-1.5 text-sm ${activeType === "all" ? "bg-brand text-white" : "bg-bg-hover text-muted"}`}>全部</button>
        {filters.map((t) => (
          <button key={t} onClick={() => setActiveType(t)} className={`rounded-full px-3 py-1.5 text-sm ${activeType === t ? "bg-brand text-white" : "bg-bg-hover text-muted"}`}>
            {CONTENT_TYPE_LABELS[t]}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索名称…" className="ml-auto w-40 rounded-lg border border-line bg-bg-soft px-3 py-1.5 text-sm outline-none focus:border-accent" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[300px] w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted">还没有记录，去首页发现内容并标记「{listType === "watched" ? "已看" : "已玩"}」吧。</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((c) => <ContentCard key={c.id} c={c} onAction={load} />)}
        </div>
      )}
    </div>
  );
}
