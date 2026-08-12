"use client";

import { useCallback, useEffect, useState } from "react";
import { NormalizedContent, ContentType } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import ContentCard from "./ContentCard";
import { showToast } from "./toast";

export default function CategoryBrowser({ type, title }: { type: ContentType; title: string }) {
  const cats = CATEGORIES[type];
  const [active, setActive] = useState<string>(cats[0]?.key ?? "popular");
  const [items, setItems] = useState<NormalizedContent[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/content?type=${type}&category=${encodeURIComponent(active)}&page=${page}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setIsMock(!!data.isMock);
    } catch {
      showToast("加载失败", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [active, type, page]);

  useEffect(() => { setPage(1); }, [active]);
  useEffect(() => { load(); }, [load]);

  const refresh = () => { setPage((p) => p + 1); };

  const tabs = cats;

  return (
    <div className="pt-2">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-xl font-bold">{title}</h1>
        {isMock && <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">MOCK 数据源</span>}
      </div>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActive(t.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${active === t.key ? "bg-brand text-white" : "bg-bg-hover text-muted"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex justify-end">
        <button onClick={refresh} disabled={loading} className="btn btn-outline">换一批 ↻</button>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton h-[300px] w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((c) => <ContentCard key={c.id} c={c} />)}
        </div>
      )}
      {!loading && items.length === 0 && <div className="py-12 text-center text-muted">暂无内容，点「换一批」试试</div>}
    </div>
  );
}
