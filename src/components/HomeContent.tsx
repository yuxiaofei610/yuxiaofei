"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NormalizedContent, ContentType } from "@/lib/types";
import ContentCard from "./ContentCard";

const MODES = [
  { k: "hot", label: "热门" },
  { k: "rating", label: "高分" },
  { k: "year", label: "最新" },
  { k: "random", label: "随机" },
  { k: "niche", label: "小众佳作" },
];

export function routeForType(type: ContentType): string {
  if (type === "single_player_game") return "/game";
  return `/${type}`;
}

export function CategorySection({
  type,
  label,
  initial,
}: {
  type: ContentType;
  label: string;
  initial?: NormalizedContent[];
}) {
  const [items, setItems] = useState<NormalizedContent[]>(initial ?? []);
  const [mode, setMode] = useState("hot");
  const [loading, setLoading] = useState(!initial || initial.length === 0);

  const load = async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content?type=${type}&category=popular&sort=${m}&perPage=8`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      /* 单类加载失败不影响整体 */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initial || initial.length === 0) load("hot");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeMode = (m: string) => {
    setMode(m);
    load(m);
  };

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{label}</h2>
        <div className="flex items-center gap-1">
          {MODES.map((mo) => (
            <button
              key={mo.k}
              onClick={() => changeMode(mo.k)}
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                mode === mo.k ? "bg-brand text-white" : "text-muted hover:text-white"
              }`}
            >
              {mo.label}
            </button>
          ))}
          <Link href={routeForType(type)} className="ml-1 rounded-full px-2.5 py-1 text-xs text-brand hover:underline">
            更多 ›
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 w-[160px] shrink-0 animate-pulse rounded-xl bg-bg-hover" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {items.map((c) => (
            <ContentCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </section>
  );
}
