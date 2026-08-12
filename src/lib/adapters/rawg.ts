import { ContentType, NormalizedContent } from "../types";
import { normalizeGenres } from "../genreMap";

// RAWG 真实数据源（需要 API Key：https://rawg.io/apidocs）
// 用于：手游 / 网游 / 单机。未配置 RAWG_API_KEY 时由 index.ts 回退到标注 MOCK。
// 注意：RAWG 不显式区分「网游/单机」，这里按平台与标签做最佳近似（详见交付文档）。

const RAWG_API = "https://api.rawg.io/api";

export class RawgNoKeyError extends Error {
  constructor() {
    super("RAWG_API_KEY_NOT_SET");
    this.name = "RawgNoKeyError";
  }
}

function key(): string {
  const k = process.env.RAWG_API_KEY;
  if (!k) throw new RawgNoKeyError();
  return k;
}

async function rawgGet(path: string, params: Record<string, string | number>): Promise<any> {
  const url = new URL(RAWG_API + path);
  url.searchParams.set("key", key());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`RAWG HTTP ${res.status}`);
  return res.json();
}

function classify(platforms: { slug?: string }[] = [], tags: { name?: string }[] = []): ContentType {
  const slugs = platforms.map((p) => p.slug || "").join(",").toLowerCase();
  const tagNames = tags.map((t) => (t.name || "").toLowerCase()).join(",");
  if (slugs.includes("ios") || slugs.includes("android")) return "mobile_game";
  if (tagNames.includes("massively multiplayer") || tagNames.includes("mmo") || tagNames.includes("mmorpg"))
    return "online_game";
  return "single_player_game";
}

function mapGame(g: any): NormalizedContent {
  const ct = classify(g.platforms, g.tags);
  const platforms = (g.platforms || []).map((p: any) => p.slug).filter(Boolean);
  return {
    id: `rawg:${g.id}`,
    contentType: ct,
    title: g.name,
    originalTitle: null,
    description: g.description_raw || g.description || null,
    coverImage: g.background_image || null,
    releaseDate: g.released || null,
    rating: g.rating != null ? Math.round(g.rating * 2 * 10) / 10 : null, // RAWG 是 0-5，转 0-10
    popularity: g.rating_count ?? g.added ?? null,
    language: null,
    country: null,
    genres: normalizeGenres((g.genres || []).map((x: any) => x.name)),
    tags: (g.tags || []).slice(0, 6).map((t: any) => t.name),
    externalId: String(g.id),
    source: "rawg",
    isMock: false,
    developer: (g.developers && g.developers[0]?.name) || null,
    publisher: (g.publishers && g.publishers[0]?.name) || null,
    platforms,
  };
}

export async function fetchRawgList(contentType: ContentType, category: string, page = 1): Promise<NormalizedContent[]> {
  const params: Record<string, string | number> = { page, page_size: 20, ordering: "-rating" };
  // 按内容类型筛选平台
  if (contentType === "mobile_game") params.platforms = "3,21"; // Android, iOS
  if (category.startsWith("genre:")) params.genres = category.split(":")[1];
  if (category === "new") params.ordering = "-released";
  if (category === "popular") params.ordering = "-added";
  const data = await rawgGet("/games", params);
  // 二次过滤：RAWWG 平台筛选不精确，按 classify 兜底
  return (data.results || [])
    .map(mapGame)
    .filter((c: NormalizedContent) => c.contentType === contentType);
}

export async function fetchRawgSearch(query: string, page = 1): Promise<NormalizedContent[]> {
  const data = await rawgGet("/games", { search: query, page, page_size: 20, ordering: "-rating" });
  return (data.results || []).map(mapGame);
}

export async function fetchRawgDetail(id: string): Promise<NormalizedContent | null> {
  try {
    const g = await rawgGet(`/games/${id}`, {});
    if (!g) return null;
    const base = mapGame(g);
    return base;
  } catch {
    return null;
  }
}
