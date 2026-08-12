"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NormalizedContent, ContentType } from "@/lib/types";
import ContentCard from "./ContentCard";
import { showToast } from "./toast";

interface Props {
  title: string;
  type: ContentType | "all";  // 内容类型；"all" 用于首页混合推荐
  mode?: "content" | "recommend"; // content=浏览分类; recommend=个性化/换一批
  category?: string;          // content 模式下的分类 key
  source?: string;            // recommend 模式下的推荐来源（用于去重）
  count?: number;
  subtitle?: string;
}

export default function ContentRow({ title, type, mode = "content", category = "popular", source = "homepage", count = 20, subtitle }: Props) {
  const [items, setItems] = useState<NormalizedContent[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const buildUrl = useCallback(
    (p: number) =>
      mode === "recommend"
        ? `/api/recommend?type=${type}&source=${source}&page=${p}&count=${count}`
        : `/api/content?type=${type}&category=${encodeURIComponent(category)}&page=${p}`,
    [mode, type, source, count, category]
  );

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await fetch(buildUrl(p));
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setItems(data.items);
          setIsMock(!!data.isMock);
        } else {
          setItems([]);
        }
      } catch {
        showToast("加载失败", "error");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [buildUrl]
  );

  useEffect(() => { load(1); }, [load]);

  const refresh = () => {
    const next = page + 1;
    setPage(next);
    load(next);
    if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
  };

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className="py-4">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {title}
            {isMock && <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">MOCK 数据源</span>}
          </h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={refresh} disabled={loading} className="btn btn-outline text-sm">换一批 ↻</button>
        </div>
      </div>

      <div className="relative">
        <button onClick={() => scrollBy(-1)} className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-bg-soft p-2 text-muted shadow md:block hover:text-white">‹</button>
        <div ref={scrollRef} className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {loading && items.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[300px] w-[160px] shrink-0 sm:w-[180px]" />)
            : items.map((c) => <ContentCard key={c.id} c={c} />)}
          {!loading && items.length === 0 && <div className="py-8 text-sm text-muted">暂无内容</div>}
        </div>
        <button onClick={() => scrollBy(1)} className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-bg-soft p-2 text-muted shadow md:block hover:text-white">›</button>
      </div>
    </section>
  );
}
