"use client";

import { useCallback, useEffect, useState } from "react";
import { NormalizedContent, ContentType } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import ContentCard from "./ContentCard";
import { showToast } from "./toast";

export default function CategoryBrowser({
  type,
  title,
  initialItems,
  initialIsMock,
  initialCategory,
}: {
  type: ContentType;
  title: string;
  initialItems?: NormalizedContent[];
  initialIsMock?: boolean;
  initialCategory?: string;
}) {
  const cats = CATEGORIES[type];
  const defaultCat = initialCategory ?? cats[0]?.key ?? "popular";
  const needsFetch = !initialItems || initialItems.length === 0;
  const [active, setActive] = useState<string>(defaultCat);
  const [items, setItems] = useState<NormalizedContent[]>(initialItems ?? []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(needsFetch);
  const [isMock, setIsMock] = useState<boolean>(initialIsMock ?? false);

  // 筛选条件：评分区间 / 年份 / 排序
  const [minRating, setMinRating] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState<"hot" | "rating" | "year">("hot");
  const [applied, setApplied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, category: active, page: String(page), sort });
      if (minRating) params.set("minRating", minRating);
      if (year) params.set("year", year);
      const res = await fetch(`/api/content?${params.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setIsMock(!!data.isMock);
    } catch {
      showToast("加载失败", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [active, type, page, sort, minRating, year]);

  useEffect(() => { setPage(1); }, [active]);
  // 首屏：SSR 已直出默认 tab 数据时跳过自动拉取；切 tab / 换一批 / 应用筛选 则正常拉取。
  const skipFirst = !!initialItems?.length && active === defaultCat && page === 1;
  useEffect(() => {
    if (skipFirst && !applied) return;
    load();
  }, [load, skipFirst, applied]);

  const refresh = () => { setPage((p) => p + 1); };
  const applyFilters = () => { setApplied(true); setPage(1); };

  const tabs = cats;

  return (
    <div className="pt-2">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-xl font-bold">{title}</h1>
        {isMock && <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">MOCK 数据源</span>}
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActive(t.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${active === t.key ? "bg-brand text-white" : "bg-bg-hover text-muted"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 筛选条：评分区间 / 年份 / 排序 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="rounded-lg border border-line bg-bg-soft px-2 py-1.5 text-sm text-white outline-none"
        >
          <option value="">评分不限</option>
          <option value="7">≥ 7.0</option>
          <option value="8">≥ 8.0</option>
          <option value="9">≥ 9.0</option>
        </select>
        <input
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
          placeholder="年份"
          className="w-20 rounded-lg border border-line bg-bg-soft px-2 py-1.5 text-sm text-white outline-none placeholder:text-muted"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "hot" | "rating" | "year")}
          className="rounded-lg border border-line bg-bg-soft px-2 py-1.5 text-sm text-white outline-none"
        >
          <option value="hot">综合排序</option>
          <option value="rating">按评分</option>
          <option value="year">按年份</option>
        </select>
        <button onClick={applyFilters} className="btn btn-brand text-sm">筛选</button>
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
      {!loading && items.length === 0 && <div className="py-12 text-center text-muted">暂无内容，调整筛选或点「换一批」试试</div>}
    </div>
  );
}
