"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GenreProfile { key: string; weight: number; }
interface UserData {
  user: { username: string } | null;
  counts: { watched: number; played: number; likes: number; dislikes: number };
  profile: { genres: GenreProfile[]; hasData: boolean };
}

export default function PreferencesPage() {
  const [data, setData] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/user").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="py-12 text-center text-muted">加载中…</div>;

  if (!data.user) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">未登录，无法查看个人偏好。</p>
        <Link href="/login" className="btn btn-brand mt-4">去登录</Link>
      </div>
    );
  }

  const max = Math.max(1, ...data.profile.genres.map((g) => Math.abs(g.weight)));

  return (
    <div className="pt-2">
      <h1 className="mb-1 text-xl font-bold">我的偏好</h1>
      <p className="mb-4 text-sm text-muted">你好，{data.user.username}。推荐系统会根据你的行为动态调整以下权重。</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "已看", v: data.counts.watched },
          { label: "已玩", v: data.counts.played },
          { label: "喜欢", v: data.counts.likes },
          { label: "不喜欢", v: data.counts.dislikes },
        ].map((c) => (
          <div key={c.label} className="card p-4 text-center">
            <div className="text-2xl font-black text-brand">{c.v}</div>
            <div className="text-xs text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-bold">兴趣画像</h2>
      {data.profile.genres.length === 0 ? (
        <div className="card p-6 text-center text-muted">
          还没有兴趣数据。首页首次访问会弹出「你喜欢什么？」引导；或浏览、标记喜欢后自动生成。
        </div>
      ) : (
        <div className="card space-y-2 p-4">
          {data.profile.genres.map((g) => {
            const pct = (Math.abs(g.weight) / max) * 100;
            const positive = g.weight >= 0;
            return (
              <div key={g.key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm">{g.key}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-hover">
                  <div className={`h-full ${positive ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`w-10 text-right text-xs ${positive ? "text-green-400" : "text-red-400"}`}>{g.weight > 0 ? "+" : ""}{g.weight}</span>
              </div>
            );
          })}
          <p className="pt-2 text-[11px] text-muted">权重范围 -10 ~ +10。喜欢 / 已看提升相关类型权重，不喜欢降低（不会永久屏蔽整类）。</p>
        </div>
      )}
    </div>
  );
}
