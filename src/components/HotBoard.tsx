"use client";

import Link from "next/link";
import { HotBoard } from "@/lib/hot";

export default function HotBoardList({ boards }: { boards: HotBoard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {boards.map((b) => (
        <div key={b.key} className="card flex flex-col rounded-2xl border border-line bg-bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <span className="text-lg">{b.icon}</span>
              {b.title}
            </h3>
            {b.moreUrl && (
              <a href={b.moreUrl} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
                去{b.sourceLabel} ›
              </a>
            )}
          </div>
          {b.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">暂无数据</p>
          ) : (
            <ol className="space-y-0.5">
              {b.items.map((it, i) => {
                const inner = (
                  <>
                    <span className="w-4 shrink-0 text-right text-xs font-bold text-muted">{i + 1}</span>
                    {it.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.coverImage} alt="" className="h-11 w-8 shrink-0 rounded object-cover" loading="lazy" />
                    ) : (
                      <span className="h-11 w-8 shrink-0 rounded bg-bg-soft" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{it.title}</span>
                    {it.subtitle && <span className="hidden shrink-0 text-xs text-muted sm:inline">{it.subtitle}</span>}
                  </>
                );
                return it.detailPath ? (
                  <li key={i}>
                    <Link href={it.detailPath} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-hover">
                      {inner}
                    </Link>
                  </li>
                ) : (
                  <li key={i}>
                    <a href={it.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-hover">
                      {inner}
                    </a>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
