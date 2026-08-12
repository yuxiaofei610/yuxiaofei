import { ContentType, NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";

// TVmaze 公开 API：免 API Key，真实剧集/综艺/纪录片数据。
// 文档：https://www.tvmaze.com/api
// 说明：
//  - 电视剧：用 TVmaze 全部剧集（按 weight/rating/premiered 排序）。
//  - 综艺：TVmaze 无"综艺"独立类型，用 Reality / Talk Show / Game Show 类型近似（主要是欧美节目）。
//  - 纪录片：TVmaze 有 "Documentary" 大类，子题材（自然/历史等）无法精确区分，统一展示 Documentary 类。
// 绝不伪造数据；无可用细分时如实标注限制。

const BASE = "https://api.tvmaze.com";
const BATCH = 12; // 每次拉取的 tvmaze 页数（每页 250 条），用于本地排序/ type+genre 过滤（题材子类需更大窗口）

function stripHtml(s?: string | null): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  return t || null;
}

export interface TvmazeOpts {
  contentType: ContentType; // tv | variety | documentary
  genres?: string[]; // TVmaze genre 名（用于纪录片子题材过滤）
  types?: string[]; // TVmaze type 字段过滤（Documentary / Reality / Talk Show / Game Show 等）
  sort: "weight" | "rating" | "new";
  page: number;
  perPage: number;
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`tvmaze ${r.status}`);
  return r.json();
}

async function fetchPages(startPage: number, count: number): Promise<any[]> {
  const pages = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      fetchJson(`${BASE}/shows?page=${startPage + i}`).catch(() => [])
    )
  );
  return pages.flat();
}

export async function fetchTvmazeList(opts: TvmazeOpts): Promise<NormalizedContent[]> {
  const cacheKey = `tvmaze:${opts.contentType}:${(opts.genres || []).join(",")}:${opts.sort}:${opts.page}:${opts.perPage}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  const startPage = (opts.page - 1) * BATCH;
  let shows = await fetchPages(startPage, BATCH);

  if (opts.types && opts.types.length) {
    const set = new Set(opts.types);
    shows = shows.filter((s: any) => set.has(s.type));
  }

  if (opts.genres && opts.genres.length) {
    const set = new Set(opts.genres);
    shows = shows.filter((s: any) => (s.genres || []).some((g: string) => set.has(g)));
  }

  if (opts.sort === "rating") {
    shows = shows
      .filter((s: any) => s.rating && s.rating.average != null)
      .sort((a: any, b: any) => (b.rating.average || 0) - (a.rating.average || 0));
  } else if (opts.sort === "new") {
    shows = shows
      .filter((s: any) => s.premiered)
      .sort((a: any, b: any) => (b.premiered || "").localeCompare(a.premiered || ""));
  } else {
    shows = shows.sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0));
  }

  const items = shows.slice(0, opts.perPage).map((s: any) => mapShow(s, opts.contentType));
  cacheSet(cacheKey, items, TTL.hot);
  return items;
}

export async function fetchTvmazeSearch(query: string, contentType: ContentType): Promise<NormalizedContent[]> {
  const cacheKey = `tvmaze:search:${contentType}:${query}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const data = await fetchJson(`${BASE}/search/shows?q=${encodeURIComponent(query)}`).catch(() => []);
  const items = (data || [])
    .map((d: any) => d.show)
    .filter(Boolean)
    .map((s: any) => mapShow(s, contentType))
    .slice(0, 10);
  cacheSet(cacheKey, items, TTL.search);
  return items;
}

export async function fetchTvmazeDetail(id: string, contentType: ContentType): Promise<NormalizedContent | null> {
  const cacheKey = `tvmaze:detail:${contentType}:${id}`;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;
  const s = await fetchJson(`${BASE}/shows/${id}?embed=cast`).catch(() => null);
  if (!s) return null;
  const c = mapShow(s, contentType);
  const cast = (s._embedded?.cast || [])
    .map((x: any) => x.person?.name)
    .filter(Boolean)
    .slice(0, 8);
  if (cast.length) c.tags = cast;
  cacheSet(cacheKey, c, TTL.detail);
  return c;
}

function mapShow(s: any, ct: ContentType): NormalizedContent {
  const cover = s.image?.original || s.image?.medium || null;
  const country = s.network?.country?.code || s.webChannel?.country?.code || null;
  return {
    id: `tvmaze:${s.id}`,
    contentType: ct,
    title: s.name,
    originalTitle: null,
    description: stripHtml(s.summary),
    coverImage: cover,
    releaseDate: s.premiered || null,
    rating: s.rating?.average ?? null, // TVmaze 已是 0-10
    popularity: s.weight ?? null,
    language: s.language || null,
    country,
    genres: s.genres || [],
    tags: [],
    externalId: String(s.id),
    source: "tvmaze",
    isMock: false,
  };
}
