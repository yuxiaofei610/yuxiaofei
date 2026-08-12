"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_GENRES, INITIAL_GAME_GENRES } from "@/lib/genreMap";
import { CONTENT_TYPE_LABELS, CONTENT_TYPES } from "@/lib/types";
import { showToast } from "./toast";

const COUNTRIES = ["中国", "日本", "韩国", "美国", "英国", "法国"];

function CheckGroup({ title, options, selected, toggle }: { title: string; options: string[]; selected: Set<string>; toggle: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} onClick={() => toggle(o)} className={`rounded-full px-3 py-1.5 text-sm ${selected.has(o) ? "bg-brand text-white" : "bg-bg-hover text-muted"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InitialChoice() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [genres, setGenres] = useState<Set<string>>(new Set(INITIAL_GENRES.slice(0, 3)));
  const [gameGenres, setGameGenres] = useState<Set<string>>(new Set(INITIAL_GAME_GENRES.slice(0, 2)));
  const [types, setTypes] = useState<Set<string>>(new Set(["movie", "anime"]));
  const [countries, setCountries] = useState<Set<string>>(new Set(["中国", "日本", "美国"]));

  useEffect(() => {
    fetch("/api/user").then((r) => r.json()).then((d) => {
      if (d.user && d.profile && d.profile.hasData === false) setOpen(true);
    }).catch(() => {});
  }, []);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (v: string) =>
    setter((prev) => { const n = new Set(prev); if (n.has(v)) n.delete(v); else n.add(v); return n; });

  const submit = async () => {
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "init",
        genres: [...genres],
        gameGenres: [...gameGenres],
        types: [...types],
        countries: [...countries],
      }),
    });
    if (res.ok) {
      showToast("兴趣已初始化，开始为你推荐", "success");
      setOpen(false);
      router.refresh();
    } else {
      showToast("初始化失败", "error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-bg-soft p-6">
        <h2 className="text-xl font-bold">你喜欢什么？</h2>
        <p className="mt-1 text-sm text-muted">选择你的兴趣，初始化个性化推荐（可随时在「我的偏好」调整）。</p>
        <div className="mt-4 space-y-4">
          <CheckGroup title="影视类型" options={INITIAL_GENRES} selected={genres} toggle={toggle(setGenres)} />
          <CheckGroup title="游戏类型" options={INITIAL_GAME_GENRES} selected={gameGenres} toggle={toggle(setGameGenres)} />
          <CheckGroup title="内容类型" options={CONTENT_TYPES.map((t) => CONTENT_TYPE_LABELS[t])} selected={new Set([...types].map((t) => CONTENT_TYPE_LABELS[t as keyof typeof CONTENT_TYPE_LABELS]))} toggle={(label) => { const key = CONTENT_TYPES.find((t) => CONTENT_TYPE_LABELS[t] === label); if (key) toggle(setTypes)(key); }} />
          <CheckGroup title="国家/地区" options={COUNTRIES} selected={countries} toggle={toggle(setCountries)} />
        </div>
        <button onClick={submit} className="btn btn-brand mt-6 w-full">开始体验</button>
      </div>
    </div>
  );
}
