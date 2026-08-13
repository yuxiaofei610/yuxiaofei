"use client";

import { useState } from "react";
import { ContentType } from "@/lib/types";
import ContentRow from "./ContentRow";

const MORE: { title: string; type: ContentType; subtitle: string }[] = [
  { title: "热门动漫", type: "anime", subtitle: "数据来自 Bangumi" },
  { title: "热门综艺", type: "variety", subtitle: "豆瓣 / TMDB 中文" },
  { title: "热门纪录片", type: "documentary", subtitle: "TMDB 中文" },
  { title: "热门音乐", type: "music", subtitle: "QQ音乐 / iTunes" },
];

// 首屏只 SSR 直出电影 + 电视剧（防手机白屏），其余分类由用户点击「加载更多」后客户端懒加载。
export default function LazyCategories() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div>
      {!loaded ? (
        <div className="py-6 text-center">
          <button onClick={() => setLoaded(true)} className="btn btn-brand">加载更多分类 ↻</button>
        </div>
      ) : (
        MORE.map((r) => (
          <ContentRow
            key={r.type}
            title={r.title}
            type={r.type}
            category="popular"
            subtitle={r.subtitle}
          />
        ))
      )}
    </div>
  );
}
