import { ContentType, NormalizedContent } from "../types";

// TMDB 真实数据源（需要 API Key：https://www.themoviedb.org/documentation/api）
// 用于：电影 / 电视剧 / 纪录片。
// 综艺(variety)在 TMDB 没有对应分类，统一回退到 MOCK（见 index.ts）。
// 未配置 TMDB_API_KEY 时，index.ts 会自动切换到标注 MOCK 的数据，不会伪造真实数据。

const TMDB_API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

const MOVIE_GENRES: Record<number, string> = {
  28: "动作", 12: "冒险", 16: "动画", 35: "喜剧", 80: "犯罪",
  99: "纪录片", 18: "剧情", 10751: "家庭", 14: "奇幻", 27: "恐怖",
  10402: "音乐", 9648: "悬疑", 10749: "爱情", 878: "科幻", 53: "惊悚",
  10752: "战争", 37: "西部",
};
const TV_GENRES: Record<number, string> = {
  10759: "动作冒险", 16: "动画", 35: "喜剧", 80: "犯罪", 99: "纪录片",
  18: "剧情", 10751: "家庭", 10762: "儿童", 9648: "悬疑", 10763: "新闻",
  10764: "真人秀", 10765: "科幻奇幻", 10766: "肥皂剧", 10767: "脱口秀",
  10768: "战争政治", 37: "西部",
};

export class TmdbNoKeyError extends Error {
  constructor() {
    super("TMDB_API_KEY_NOT_SET");
    this.name = "TmdbNoKeyError";
  }
}

function key(): string {
  const k = process.env.TMDB_API_KEY;
  if (!k) throw new TmdbNoKeyError();
  return k;
}

async function tmdbGet(path: string, params: Record<string, string | number>): Promise<any> {
  const url = new URL(TMDB_API + path);
  url.searchParams.set("api_key", key());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
  return res.json();
}

function mapMovie(m: any, ct: ContentType): NormalizedContent {
  return {
    id: `tmdb:${ct}:${m.id}`,
    contentType: ct,
    title: m.title || m.name,
    originalTitle: m.original_title || m.original_name || null,
    description: m.overview || null,
    coverImage: m.poster_path ? IMG + m.poster_path : null,
    releaseDate: m.release_date || m.first_air_date || null,
    rating: m.vote_average != null ? Math.round(m.vote_average * 10) / 10 : null,
    popularity: m.popularity ?? null,
    language: m.original_language || null,
    country: m.origin_country?.[0] || m.production_countries?.[0]?.iso_3166_1 || null,
    genres: (m.genre_ids || []).map((g: number) => (ct === "tv" ? TV_GENRES[g] : MOVIE_GENRES[g])).filter(Boolean),
    tags: [],
    externalId: String(m.id),
    source: "tmdb",
    isMock: false,
  };
}

// category: popular | top_rated | upcoming | genre:<id> | documentary
export async function fetchTmdbList(ct: "movie" | "tv" | "documentary", category: string, page = 1): Promise<NormalizedContent[]> {
  const endpointType: "movie" | "tv" = ct === "tv" ? "tv" : "movie";
  let path: string;
  const params: Record<string, string | number> = { page };
  if (endpointType === "movie") {
    if (category === "documentary" || category.startsWith("genre:99")) {
      path = "/discover/movie";
      params.with_genres = 99;
    } else if (category.startsWith("genre:")) {
      path = "/discover/movie";
      params.with_genres = category.split(":")[1];
    } else {
      path = `/movie/${category === "top_rated" ? "top_rated" : category === "upcoming" ? "upcoming" : "popular"}`;
    }
  } else {
    if (category.startsWith("genre:")) {
      path = "/discover/tv";
      params.with_genres = category.split(":")[1];
    } else {
      path = `/tv/${category === "top_rated" ? "top_rated" : "popular"}`;
    }
  }
  const data = await tmdbGet(path, params);
  return (data.results || []).map((m: any) => mapMovie(m, ct));
}

export async function fetchTmdbSearch(ct: "movie" | "tv", query: string, page = 1): Promise<NormalizedContent[]> {
  const path = `/search/${ct}`;
  const data = await tmdbGet(path, { query, page, include_adult: "false" });
  return (data.results || []).map((m: any) => mapMovie(m, ct));
}

export async function fetchTmdbDetail(ct: "movie" | "tv", id: string): Promise<NormalizedContent | null> {
  try {
    const m = await tmdbGet(`/${ct}/${id}`, {});
    if (!m) return null;
    const base = mapMovie(m, ct);
    base.description = m.overview || base.description;
    return base;
  } catch {
    return null;
  }
}
