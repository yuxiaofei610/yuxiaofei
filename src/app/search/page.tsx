"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { NormalizedContent, CONTENT_TYPE_LABELS, ContentType } from "@/lib/types";
import ContentCard from "@/components/ContentCard";
import { showToast } from "@/components/toast";

function SearchInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const initial = sp.get("q") || "";
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState<NormalizedContent[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (query: string) => {
    if (!query.trim()) { setItems([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      showToast("搜索失败", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (initial) run(initial); }, [initial, run]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    run(q);
  };

  // 按类型分组
  const groups: Record<string, NormalizedContent[]> = {};
  for (const it of items) {
    (groups[it.contentType] ||= []).push(it);
  }

  return (
    <div className="pt-2">
      <form onSubmit={submit} className="mb-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索电影 / 动漫 / 游戏…" className="flex-1 rounded-lg border border-line bg-bg-soft px-4 py-2 outline-none focus:border-accent" />
        <button className="btn btn-brand">搜索</button>
      </form>

      {loading && <div className="py-12 text-center text-muted">搜索中…</div>}

      {!loading && items.length === 0 && initial && <div className="py-12 text-center text-muted">未找到「{initial}」相关内容</div>}
      {!loading && items.length === 0 && !initial && <div className="py-12 text-center text-muted">输入关键词开始全局搜索</div>}

      {Object.entries(groups).map(([type, list]) => (
        <section key={type} className="mb-6">
          <h2 className="mb-2 text-lg font-bold">{CONTENT_TYPE_LABELS[type as ContentType]} <span className="text-sm text-muted">({list.length})</span></h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {list.map((c) => <ContentCard key={c.id} c={c} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted">加载中…</div>}>
      <SearchInner />
    </Suspense>
  );
}
