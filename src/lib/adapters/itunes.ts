import { NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";

// Apple iTunes / Apple Music 公开接口：免 API Key，真实音乐数据。
//  - 热门榜单：iTunes RSS Feed（us/jp/hk 可用；cn 不可用，华语用 hk 榜近似）。
//  - 搜索：iTunes Search API（entity=song），真实歌曲/艺人/专辑/封面。
//  - 详情：iTunes Lookup（按 trackId）。
// 绝不伪造；歌曲无评分/热度，字段留 null（前端优雅降级，不显示伪造数值）。
// 外部链接严格遵循需求：音乐只提供 QQ音乐入口（见 external.ts），不在此加 iTunes 链接。

const RSS = "https://itunes.apple.com";
const SEARCH = "https://itunes.apple.com";

// 分类 key → RSS 国家代码
const RSS_COUNTRY: Record<string, string> = {
  popular: "us",
  us: "us",
  jp: "jp",
  cn: "hk", // cn RSS 不可用，hk 榜含华语
};

function bigArt(url?: string | null): string | null {
  if (!url) return null;
  return url.replace(/\/\d+x\d+bb/, "/512x512bb");
}

function dateOnly(s?: string | null): string | null {
  if (!s) return null;
  return s.slice(0, 10);
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`itunes ${r.status}`);
  return r.json();
}

export async function fetchItunesList(category: string, page = 1, perPage = 20): Promise<NormalizedContent[]> {
  const cacheKey = `itunes:list:${category}:${page}:${perPage}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  let items: NormalizedContent[] = [];
  const cc = RSS_COUNTRY[category] || "us";
  const data = await fetchJson(`${RSS}/${cc}/rss/topsongs/limit=100/json`).catch(() => null);
  if (data?.feed?.entry) {
    items = data.feed.entry.map((e: any) => mapEntry(e, cc));
  }

  // 支持「换一批」：在最多 100 首真实榜单内按 page 翻窗
  const start = ((page - 1) * perPage) % Math.max(items.length, 1);
  let windowed = items.slice(start, start + perPage);
  if (windowed.length < perPage) {
    windowed = [...windowed, ...items.slice(0, perPage - windowed.length)];
  }
  cacheSet(cacheKey, windowed, TTL.hot);
  return windowed;
}

export async function fetchItunesSearch(query: string): Promise<NormalizedContent[]> {
  const cacheKey = `itunes:search:${query}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const data = await fetchJson(
    `${SEARCH}/search?term=${encodeURIComponent(query)}&entity=song&limit=20&country=CN`
  ).catch(() => null);
  const items = (data?.results || []).map(mapTrack).slice(0, 20);
  cacheSet(cacheKey, items, TTL.search);
  return items;
}

export async function fetchItunesDetail(trackId: string): Promise<NormalizedContent | null> {
  const cacheKey = `itunes:detail:${trackId}`;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;
  const data = await fetchJson(`${SEARCH}/lookup?id=${trackId}&country=US`).catch(() => null);
  const c = data?.results?.[0] ? mapTrack(data.results[0]) : null;
  cacheSet(cacheKey, c, TTL.detail);
  return c;
}

function mapEntry(e: any, cc: string): NormalizedContent {
  const id = e.id?.attributes?.["im:id"];
  const images: any[] = e["im:image"] || [];
  const cover = images.length ? bigArt(images[images.length - 1].label) : null;
  return {
    id: `itunes:${id}`,
    contentType: "music",
    title: e["im:name"]?.label || "未知歌曲",
    originalTitle: null,
    description: null,
    coverImage: cover,
    releaseDate: dateOnly(e["im:releaseDate"]?.label),
    rating: null,
    popularity: null,
    language: null,
    country: cc,
    genres: e.category?.attributes?.label ? [e.category.attributes.label] : [],
    tags: [],
    externalId: String(id),
    source: "itunes",
    isMock: false,
    artist: e["im:artist"]?.label || null,
    album: null,
  };
}

function mapTrack(t: any): NormalizedContent {
  return {
    id: `itunes:${t.trackId}`,
    contentType: "music",
    title: t.trackName || t.trackCensoredName || "未知歌曲",
    originalTitle: null,
    description: null,
    coverImage: bigArt(t.artworkUrl100) || bigArt(t.artworkUrl60) || null,
    releaseDate: dateOnly(t.releaseDate),
    rating: null,
    popularity: null,
    language: null,
    country: t.country || null,
    genres: t.primaryGenreName ? [t.primaryGenreName] : [],
    tags: [],
    externalId: String(t.trackId),
    source: "itunes",
    isMock: false,
    artist: t.artistName || null,
    album: t.collectionName || null,
  };
}
