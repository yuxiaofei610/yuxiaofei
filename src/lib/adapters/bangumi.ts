import { ContentType, NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";

// Bangumi（番组计划）中文动漫数据源，免 OAuth 公开接口（可选配 BANGUMI_APP_ID 提额）。
// 文档: https://bangumi.github.io/api/
const BGM = "https://api.bgm.tv";
const BGM_V0 = "https://api.bgm.tv/v0";

function appId(): string | undefined {
  const id = process.env.BANGUMI_APP_ID;
  return id && id.length > 0 ? id : undefined;
}

async function bgmGet(path: string, v0 = false): Promise<any> {
  const base = v0 ? BGM_V0 : BGM;
  const url = new URL(base + path);
  const id = appId();
  if (id) url.searchParams.set("app_id", id);
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "recommender/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Bangumi HTTP ${res.status}`);
  return res.json();
}

function stripHtml(s?: string | null): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return t || null;
}

function mapSubject(s: any, ct: ContentType = "anime"): NormalizedContent {
  const title = s.name_cn || s.name || `动漫 ${s.id}`;
  const original = s.name && s.name !== title ? s.name : null;
  const cover = s.images?.common || s.images?.large || s.images?.medium || null;
  const rating = s.rating?.score != null ? Math.round(s.rating.score * 10) / 10 : null;
  const tags = (s.tags || []).slice(0, 6).map((t: any) => t.name);
  return {
    id: `bangumi:${s.id}`,
    contentType: ct,
    title,
    originalTitle: original,
    description: stripHtml(s.summary),
    coverImage: cover,
    releaseDate: s.air_date || s.date || null,
    rating,
    popularity: s.collection?.doing ?? s.rating?.total ?? null,
    language: "ja",
    country: "JP",
    genres: tags, // Bangumi 无独立 genre 字段，用 tags 近似
    tags,
    externalId: String(s.id),
    source: "bangumi",
    isMock: false,
  };
}

// category: popular | new | score | finished | jp | cn | us
export async function fetchAnimeList(category: string, page = 1, perPage = 20): Promise<NormalizedContent[]> {
  const cacheKey = `bangumi:list:${category}:${page}:${perPage}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  const cal = await bgmGet("/calendar"); // 数组，按 weekday 分组
  let items: NormalizedContent[] = [];
  for (const day of cal || []) {
    for (const it of day.items || []) items.push(mapSubject(it));
  }
  // 去重（按 id）
  const seen = new Set<string>();
  items = items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));

  if (category === "score") items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (category === "new") items.sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""));
  else if (category === "finished") items = items.filter((i) => (i.releaseDate || "").length > 0).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); // popular 默认

  const start = (page - 1) * perPage;
  const out = items.slice(start, start + perPage);
  cacheSet(cacheKey, out, TTL.hot);
  return out;
}

export async function fetchAnimeSearch(query: string): Promise<NormalizedContent[]> {
  const cacheKey = `bangumi:search:${query}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const data = await bgmGet(`/search/subject/${encodeURIComponent(query)}?type=2&sort=rank&page=1&limit=20`, true);
  const items = (data.data || []).map((s: any) => mapSubject(s));
  cacheSet(cacheKey, items, TTL.search);
  return items;
}

export async function fetchAnimeDetail(id: string): Promise<NormalizedContent | null> {
  const numStr = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  const numId = parseInt(numStr, 10);
  if (Number.isNaN(numId)) return null;
  const cacheKey = `bangumi:detail:${numId}`;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;
  try {
    const s = await bgmGet(`/subjects/${numId}`, true);
    const c = mapSubject(s);
    cacheSet(cacheKey, c, TTL.detail);
    return c;
  } catch {
    return null;
  }
}
