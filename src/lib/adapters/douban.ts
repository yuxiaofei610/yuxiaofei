import { NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";

// Douban（豆瓣）中文数据源。Douban 无官方公开 API，使用移动端 rexxar 接口，
// 需伪造 Referer/UA 绕过反爬（实测裸请求返回 code 1287）。公网持续调用有被封风险，
// 因此音乐/影视在 index.ts 中保留多阶回退。
const REXXAR = "https://m.douban.com/rexxar/api/v2";

function isDoubanImageUrl(url: string): boolean {
  return /https?:\/\/img\d+\.doubanio\.com/i.test(url);
}

function proxyImageUrl(url: string): string {
  if (isDoubanImageUrl(url)) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// 豆瓣接口里封面字段非常不统一：
// 列表页：cover.url / pic.normal（都是海报）；
// 详情页：cover_url / pic.large / pic.normal 是海报，cover.image.normal.url 多为剧照/用户上传图，优先级应靠后。
function pickCover(s: any): string | null {
  if (!s) return null;
  let raw: string | null = null;
  // 1. 列表页主海报
  if (s.cover && typeof s.cover === "object" && typeof s.cover.url === "string" && s.cover.url) {
    raw = s.cover.url;
  }
  // 2. 详情页主海报（最可靠）
  if (!raw && typeof s.cover_url === "string" && s.cover_url) raw = s.cover_url;
  // 3. 通用字符串 cover
  if (!raw && typeof s.cover === "string" && s.cover) raw = s.cover;
  // 4. 详情页 pic（海报尺寸）
  if (!raw && s.pic && typeof s.pic === "object") {
    raw = s.pic.large || s.pic.normal || s.pic.small || null;
  }
  // 5. 详情页 cover.image 兜底（剧照/用户上传图）
  if (!raw && s.cover && typeof s.cover === "object") {
    raw = s.cover.image?.large?.url || s.cover.image?.normal?.url || s.cover.image?.small?.url || null;
  }
  // 6. 其他 image 字段
  if (!raw && s.image && typeof s.image === "object") {
    raw = s.image.large?.url || s.image.normal?.url || s.image.small?.url || s.image.url || null;
  }
  if (!raw && typeof s.image === "string" && s.image) raw = s.image;
  if (!raw && Array.isArray(s.photos) && s.photos.length > 0 && typeof s.photos[0] === "string") raw = s.photos[0];
  return raw ? proxyImageUrl(raw) : null;
}

// 列表页通常没有 genres 数组，可从 card_subtitle / info 里拆出来。
function parseGenres(s: any): string[] {
  if (Array.isArray(s.genres) && s.genres.length > 0) return s.genres;
  const txt = s.card_subtitle || s.info || "";
  const parts = txt.split(/\s*\/\s*/).map((p: string) => p.trim()).filter(Boolean);
  // card_subtitle 格式通常为：年份 / 国家 / 类型 / 导演 / 演员
  // info 格式通常为：国家 / 类型 / 导演 / 演员
  // 类型段特点：不是纯 4 位年份，且位于国家段之后。
  if (parts.length >= 3 && /^\d{4}$/.test(parts[0]) && parts.length >= 4) {
    return parts[2].split(/\s+/).filter(Boolean);
  }
  if (parts.length >= 2) {
    return parts[1].split(/\s+/).filter(Boolean);
  }
  return [];
}

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
    coverImage: pickCover(subj),
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
    originalTitle: subj.original_title || null,
    description: subj.intro || subj.summary || null,
    director: subj.directors?.[0]?.name || subj.author?.[0]?.name || null,
    coverImage: pickCover(subj),
    releaseDate: subj.year ? String(subj.year) : subj.release_date || null,
    rating: rating && rating > 0 ? rating : null,
    popularity: subj.rating && subj.rating.count != null ? subj.rating.count : null,
    language: null,
    country: null,
    genres: parseGenres(subj),
    tags: [],
    externalId: String(id),
    source: "douban",
    isMock: false,
    artist: null,
    album: null,
  };
}

// 列表项通常没有简介/导演，按条目补一次详情以充实卡片（豆瓣详情含 intro、directors）。
// 带超时与容错：单条失败不影响整体，结果由调用方缓存。
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function enrichOne(c: NormalizedContent): Promise<NormalizedContent> {
  const num = c.externalId || (c.id.includes(":") ? c.id.slice(c.id.lastIndexOf(":") + 1) : c.id);
  if (!num) return c;
  try {
    const s = await withTimeout(doubanGet(`/subject/${num}`), 2500);
    const subj = s.subject || s;
    if (subj.intro || subj.summary) c.description = subj.intro || subj.summary || c.description;
    const dir = subj.directors?.[0]?.name || subj.author?.[0]?.name || null;
    if (dir) c.director = dir;
    if (!c.originalTitle && subj.original_title) c.originalTitle = subj.original_title;
    if (!c.releaseDate && subj.year) c.releaseDate = String(subj.year);
    // 列表接口多数项 rating 为 null，详情接口才可靠带评分；不补则评分筛选不可用。
    if (c.rating == null && subj.rating?.value != null) {
      const r = Math.round(subj.rating.value * 10) / 10;
      if (r > 0) c.rating = r;
    }
  } catch {
    /* 单条补详情失败：保留列表数据 */
  }
  return c;
}

export async function enrichVideoItems(items: NormalizedContent[]): Promise<NormalizedContent[]> {
  return Promise.all(items.map((it) => enrichOne(it).catch(() => it)));
}

const VIDEO_COLLECTION: Record<string, Record<string, string>> = {
  movie: { popular: "movie_hot", hot: "movie_hot", showing: "movie_showing", soon: "movie_soon" },
  tv: { popular: "tv_hot", hot: "tv_hot", airing: "tv_airing", domestic: "tv_domestic", us: "tv_american", kr: "tv_korean" },
  variety: { popular: "tv_variety_show", hot: "tv_variety_show" },
  documentary: { popular: "movie_documentary", hot: "movie_documentary" },
};

export async function fetchVideoList(
  ct: ContentType,
  category: string,
  page = 1,
  perPage = 20,
  enrich = false
): Promise<NormalizedContent[]> {
  const cacheKey = `douban:video:${ct}:${category}:${page}:${perPage}:${enrich ? 1 : 0}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const collMap = VIDEO_COLLECTION[ct] || {};
  const coll = collMap[category] || collMap.popular || "movie_hot";
  const start = (page - 1) * perPage;
  const data = await doubanGet(`/subject_collection/${coll}/items?start=${start}&count=${perPage}`);
  const arr = data && data.subject_collection_items ? data.subject_collection_items : [];
  const items = arr.map((s: any) => mapVideo(s, ct));
  if (items.length === 0) throw new Error("empty");
  const result = enrich ? await enrichVideoItems(items) : items;
  cacheSet(cacheKey, result, TTL.hot);
  return result;
}

export async function fetchVideoDetail(id: string, ct: ContentType): Promise<NormalizedContent | null> {
  const numStr = id.indexOf(":") >= 0 ? id.slice(id.lastIndexOf(":") + 1) : id;
  // v2: pickCover 优先级调整，旧缓存可能存了错误的 cover.image 剧照 URL
  const cacheKey = `douban:video:detail:v2:${numStr}`;
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
