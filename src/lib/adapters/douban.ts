import { NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";

// Douban（豆瓣）中文音乐数据源。Douban 无官方公开 API，使用移动端 rexxar 接口，
// 需伪造 Referer/UA 绕过反爬（实测裸请求返回 code 1287）。公网持续调用有被封风险，
// 因此 listContent/searchContent 中以 iTunes 华语榜作为兜底。
const REXXAR = "https://m.douban.com/rexxar/api/v2";

async function doubanGet(path: string): Promise<any> {
  const url = REXXAR + path;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      Referer: "https://m.douban.com/",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Douban HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.code && json.code !== 0) throw new Error(`Douban err ${json.code}`);
  return json;
}

function mapMusic(s: any, ct: "music"): NormalizedContent {
  const subj = s.target || s.subject || s;
  const id = subj.id ?? subj.douban_id ?? subj.subject_id;
  const title = subj.title || subj.name || "未知歌曲";
  const cover = subj.cover_url || subj.cover || subj.image || null;
  const rating = subj.rating?.value != null ? Math.round(subj.rating.value * 10) / 10 : null;
  return {
    id: `douban:${id}`,
    contentType: ct,
    title,
    originalTitle: null,
    description: subj.intro || subj.description || null,
    coverImage: cover,
    releaseDate: subj.year ? String(subj.year) : subj.pubdate || null,
    rating,
    popularity: subj.rating?.count ?? null,
    language: null,
    country: null,
    genres: subj.genres || [],
    tags: [],
    externalId: String(id),
    source: "douban",
    isMock: false,
    artist: subj.author?.[0]?.name || subj.artist || null,
    album: null,
  };
}

export async function fetchMusicList(category: string, page = 1, perPage = 20): Promise<NormalizedContent[]> {
  const cacheKey = `douban:music:${category}:${page}:${perPage}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const start = (page - 1) * perPage;
  const data = await doubanGet(`/subject_collection/music_hot/items?start=${start}&count=${perPage}`);
  const items = (data.items || []).map((s: any) => mapMusic(s, "music"));
  cacheSet(cacheKey, items, TTL.hot);
  return items;
}

export async function fetchMusicSearch(query: string): Promise<NormalizedContent[]> {
  const cacheKey = `douban:music:search:${query}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const data = await doubanGet(`/search?q=${encodeURIComponent(query)}&type=music&start=0`);
  const arr = data.items || data.subjects || [];
  const items = arr.slice(0, 20).map((s: any) => mapMusic(s, "music"));
  cacheSet(cacheKey, items, TTL.search);
  return items;
}

export async function fetchMusicDetail(id: string): Promise<NormalizedContent | null> {
  const numStr = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  const cacheKey = `douban:music:detail:${numStr}`;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;
  try {
    const s = await doubanGet(`/subject/${numStr}`);
    const c = mapMusic(s, "music");
    cacheSet(cacheKey, c, TTL.detail);
    return c;
  } catch {
    return null;
  }
}

import { ContentType } from "../types";

// ===== 影视（电影/电视剧/综艺/纪录片）中文数据源 =====
// 复用 doubanGet（已带 Referer/UA 绕过 rexxar 反爬）。若裸请求被拦(code 1287)，
// 由 index.ts 回退 TMDB zh-CN（仍是中文）。如需签名可后续补 _sig。
function mapVideo(s: any, ct: ContentType): NormalizedContent {
  const subj = s.subject || s;
  const id = subj.id;
  const rating =
    subj.rating && subj.rating.value != null ? Math.round(subj.rating.value * 10) / 10 : null;
  return {
    id: `douban:${id}`,
    contentType: ct,
    title: subj.title || "未知",
    originalTitle: null,
    description: subj.intro || subj.summary || null,
    coverImage: subj.cover_url || subj.cover || null,
    releaseDate: subj.year ? String(subj.year) : null,
    rating,
    popularity: subj.rating && subj.rating.count != null ? subj.rating.count : null,
    language: null,
    country: null,
    genres: subj.genres || [],
    tags: [],
    externalId: String(id),
    source: "douban",
    isMock: false,
    artist: null,
    album: null,
  };
}

const VIDEO_COLLECTION: Record<string, Record<string, string>> = {
  movie: { popular: "movie_hot", hot: "movie_hot", showing: "movie_showing", soon: "movie_soon" },
  tv: { popular: "tv_hot", hot: "tv_hot", airing: "tv_airing", domestic: "tv_domestic", us: "tv_american", kr: "tv_korean" },
  variety: { popular: "tv_variety", hot: "tv_variety" },
  documentary: { popular: "movie_documentary", hot: "movie_documentary" },
};

export async function fetchVideoList(ct: ContentType, category: string, page = 1, perPage = 20): Promise<NormalizedContent[]> {
  const cacheKey = `douban:video:${ct}:${category}:${page}:${perPage}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const collMap = VIDEO_COLLECTION[ct] || {};
  const coll = collMap[category] || collMap.popular || "movie_hot";
  const start = (page - 1) * perPage;
  const data = await doubanGet(`/subject_collection/${coll}/items?start=${start}&count=${perPage}`);
  const arr = data && data.subject_collection_items ? data.subject_collection_items : [];
  const items = arr.map((s: any) => mapVideo(s, ct));
  if (items.length === 0) throw new Error("empty");
  cacheSet(cacheKey, items, TTL.hot);
  return items;
}

export async function fetchVideoDetail(id: string, ct: ContentType): Promise<NormalizedContent | null> {
  const numStr = id.indexOf(":") >= 0 ? id.slice(id.lastIndexOf(":") + 1) : id;
  const cacheKey = `douban:video:detail:${numStr}`;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;
  try {
    const s = await doubanGet(`/subject/${numStr}`);
    const c = mapVideo(s, ct);
    cacheSet(cacheKey, c, TTL.detail);
    return c;
  } catch (e) {
    return null;
  }
}
