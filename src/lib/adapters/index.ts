import { ContentType, NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";
import { fetchAnimeList, fetchAnimeSearch, fetchAnimeDetail } from "./bangumi";
import { fetchTmdbList, fetchTmdbSearch, fetchTmdbDetail, fetchTmdbDetailByDoubanId, TmdbNoKeyError } from "./tmdb";
import { fetchRawgList, fetchRawgSearch, fetchRawgDetail, RawgNoKeyError } from "./rawg";
import { fetchItunesList, fetchItunesSearch, fetchItunesDetail } from "./itunes";
import { fetchMusicList, fetchMusicSearch, fetchMusicDetail, fetchVideoList, fetchVideoDetail, enrichVideoItems } from "./douban";
import { fetchMusicList as fetchQqList, fetchMusicSearch as fetchQqSearch, fetchMusicDetail as fetchQqDetail } from "./qqmusic";
import { attachImdbRatings } from "./imdb";
import { translateToSearchQuery, deepseekEnabled } from "./deepseek";

// 影视类（电影/电视剧/综艺/纪录片）附加 IMDb 双评分。
const VIDEO_TYPES = new Set<ContentType>(["movie", "tv", "variety", "documentary"]);
import { mockList, mockSearch, mockDetail } from "./mock";

function rawgGenreSlug(category: string): string | undefined {
  const m: Record<string, string> = {
    "genre:rpg": "role-playing-games-rpg",
    "genre:action": "action",
    "genre:strategy": "strategy",
    "genre:card": "card",
    "genre:moba": "moba",
    "genre:shooter": "shooter",
    "genre:simulation": "simulation",
    "genre:open": "open-world",
    "genre:anime": "anime",
    "genre:adventure": "adventure",
    "genre:horror": "horror",
    "genre:survival": "survival",
    "genre:indie": "indie",
    "genre:mmo": "massively-multiplayer",
    "genre:competitive": "competitive",
    "genre:social": "social",
  };
  return m[category];
}

export async function listContent(
  ct: ContentType,
  category: string,
  page = 1,
  perPage = 20,
  enrich = true,
  opts?: { minRating?: number; year?: string; sort?: "hot" | "rating" | "year" }
): Promise<NormalizedContent[]> {
  const optKey = opts ? `|${opts.minRating ?? ""}|${opts.year ?? ""}|${opts.sort ?? ""}` : "";
  const cacheKey = "list:" + ct + ":" + category + ":" + page + ":" + perPage + optKey;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  let result: NormalizedContent[];
  try {
    if (ct === "anime") {
      result = await fetchAnimeList(category, page, perPage);
    } else if (ct === "movie" || ct === "tv" || ct === "variety" || ct === "documentary") {
      try {
        result = await fetchVideoList(ct, category, page, perPage, enrich);
        if (result.length === 0) throw new Error("empty");
      } catch (e) {
        const tmdbCat = ct === "variety" ? "genre:10764" : ct === "documentary" ? "documentary" : category;
        const tmdbType: "movie" | "tv" = ct === "tv" ? "tv" : "movie";
        try {
          result = await fetchTmdbList(tmdbType, tmdbCat, page);
          if (result.length === 0) throw new Error("empty");
        } catch {
          result = mockList(ct, category, page, perPage);
        }
      }
    } else if (ct === "music") {
      try {
        result = await fetchQqList(category, page, perPage);
        if (result.length === 0) throw new Error("empty");
      } catch {
        try {
          result = await fetchMusicList(category, page, perPage);
          if (result.length === 0) throw new Error("empty");
        } catch {
          result = await fetchItunesList(category, page, perPage).catch(() =>
            mockList(ct, category, page, perPage)
          );
        }
      }
    } else if (ct === "mobile_game" || ct === "online_game" || ct === "single_player_game") {
      try {
        const g = rawgGenreSlug(category);
        result = await fetchRawgList(ct, g ? "genre:" + g : category, page);
        if (result.length === 0) throw new Error("empty");
      } catch (e) {
        if (e instanceof RawgNoKeyError) {
          result = mockList(ct, category, page, perPage);
        } else {
          result = mockList(ct, category, page, perPage);
        }
      }
    } else {
      result = mockList(ct, category, page, perPage);
    }
  } catch {
    result = mockList(ct, category, page, perPage);
  }

  // 影视类附加 IMDb 双评分（需 OMDB_API_KEY；无 key 时 attachImdbRatings 内部直接跳过）。
  if (VIDEO_TYPES.has(ct) && process.env.OMDB_API_KEY) {
    await attachImdbRatings(result);
  }

  // 服务端筛选 + 排序（评分区间 / 年份 / 排序方式），外部 API 未必支持这些精确组合。
  if (opts) {
    if (opts.minRating != null) result = result.filter((i) => (i.rating ?? 0) >= opts.minRating!);
    if (opts.year) result = result.filter((i) => !!i.releaseDate && i.releaseDate.startsWith(opts.year!));
    if (opts.sort === "rating") result = [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (opts.sort === "year") result = [...result].sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""));
  }

  cacheSet(cacheKey, result, TTL.hot);
  return result;
}

export async function searchContent(query: string, ct?: ContentType): Promise<NormalizedContent[]> {
  const cacheKey = "search:" + (ct ?? "all") + ":" + query;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  const types: ContentType[] = ct
    ? [ct]
    : ["movie", "tv", "anime", "variety", "documentary", "music"];
  const out: NormalizedContent[] = [];

  await Promise.all(
    types.map(async (t) => {
      try {
        let items: NormalizedContent[] = [];
        if (t === "anime") items = await fetchAnimeSearch(query);
        else if (t === "tv" || t === "variety" || t === "documentary")
          items = await fetchTmdbSearch(t === "documentary" ? "movie" : "tv", query);
        else if (t === "music") {
          try { items = await fetchQqSearch(query); }
          catch { try { items = await fetchMusicSearch(query); } catch { items = await fetchItunesSearch(query).catch(() => []); } }
        } else if (t === "movie") {
          try { items = await fetchTmdbSearch("movie", query); } catch (e) { if (e instanceof TmdbNoKeyError) items = mockSearch(t, query); }
        } else {
          items = mockSearch(t, query);
        }
        out.push(...items.slice(0, 8));
      } catch {
        /* 忽略单个类型的搜索失败，不阻断整体 */
      }
    })
  );

  cacheSet(cacheKey, out, TTL.search);
  return out;
}

// 封面补全：当某影视详情拿不到封面时，用片名在 TMDB 搜索。
// 若配了 DEEPSEEK_API_KEY，先用 DeepSeek 把片名转成更准的英文搜索词再搜（仅增强，不配也能工作）。
async function repairCover(
  title: string,
  originalTitle: string | null,
  ct: ContentType
): Promise<NormalizedContent | null> {
  if (!title) return null;
  const tmdbType: "movie" | "tv" = ct === "tv" ? "tv" : "movie";
  let query = title;
  if (deepseekEnabled()) {
    const q = await translateToSearchQuery(title, originalTitle);
    if (q) query = q;
  }
  try {
    const items = await fetchTmdbSearch(tmdbType, query);
    return items.find((i) => i.coverImage) || null;
  } catch {
    return null;
  }
}

export async function getDetail(
  ct: ContentType,
  id: string,
  fallback?: Partial<NormalizedContent>
): Promise<NormalizedContent | null> {
  const cacheKey = "detail:v2:" + ct + ":" + id;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;

  let result: NormalizedContent | null = null;
  const source = id.includes(":") ? id.split(":")[0] : "douban";
  const ext = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  try {
    if (ct === "anime") result = await fetchAnimeDetail(ext);
    else if (ct === "movie" || ct === "tv" || ct === "variety" || ct === "documentary") {
      const tmdbType: "movie" | "tv" = ct === "tv" ? "tv" : "movie";
      if (source === "tmdb") {
        // TMDB 源（如 tmdb:movie:445877）：直接用 TMDB ID 查详情，不能当作豆瓣 ID。
        result = await fetchTmdbDetail(tmdbType, ext);
      } else {
        // 豆瓣源或无明确前缀的历史数据：先走豆瓣详情。
        result = await fetchVideoDetail(id, ct);
      }

      // 封面缺失 / 主源失败时走补全链。
      if (!result || !result.coverImage) {
        if (source !== "tmdb") {
          // 1) 豆瓣 ID 可反查 TMDB（不要用豆瓣 ID 直接查 TMDB detail，ID 不匹配必 404）。
          const viaDouban = await fetchTmdbDetailByDoubanId(ext, tmdbType).catch(() => null);
          if (viaDouban && viaDouban.coverImage) {
            result = viaDouban;
          }
        }
        // 2) 仍无结果/无封面，用片名在 TMDB 搜索补全（DeepSeek 增强可选）。
        if (!result || !result.coverImage) {
          const title = result?.title || fallback?.title || "";
          const originalTitle = result?.originalTitle || fallback?.originalTitle || null;
          const fixed = await repairCover(title, originalTitle, ct).catch(() => null);
          if (fixed) result = fixed;
          else if (!result) result = mockDetail(id);
        }
      }
    } else if (ct === "music") {
      result = await fetchQqDetail(ext);
      if (!result) {
        result = await fetchMusicDetail(ext);
        if (!result) result = mockDetail(id);
      }
    } else if (ct === "mobile_game" || ct === "online_game" || ct === "single_player_game") {
      try { result = await fetchRawgDetail(ext); } catch { result = null; }
      if (!result) result = mockDetail(id);
    } else {
      result = mockDetail(id);
    }
  } catch {
    result = mockDetail(id);
  }

  if (result && VIDEO_TYPES.has(ct) && process.env.OMDB_API_KEY) {
    await attachImdbRatings([result]);
  }

  // 若数据源只返回 MOCK 兜底，用列表页已知的真实字段覆盖，避免显示“无法还原详情”。
  if (result && (result.isMock || !result.coverImage) && fallback) {
    if (fallback.title && (!result.title || result.title === id)) result.title = fallback.title;
    if (fallback.originalTitle && !result.originalTitle) result.originalTitle = fallback.originalTitle;
    if (fallback.coverImage && !result.coverImage) result.coverImage = fallback.coverImage;
    if (fallback.rating != null && result.rating == null) result.rating = fallback.rating;
    if (fallback.releaseDate && !result.releaseDate) result.releaseDate = fallback.releaseDate;
    if (fallback.genres?.length && !result.genres.length) result.genres = fallback.genres;
    // 兜底数据不再标记为 MOCK，避免前端把它当成无意义数据丢弃。
    if (result.isMock && (result.coverImage || result.rating != null)) result.isMock = false;
  }

  // 封面缺失 / mock 的结果只短缓存，避免错误封面被长期命中；正常结果缓存 6 小时。
  const cacheable = !!result && !!result.coverImage && !result.isMock;
  cacheSet(cacheKey, result, cacheable ? TTL.detail : 5 * 60 * 1000);
  return result;
}

// 服务端首屏预取：带超时降级，用于 SSR 直出。
// 目的：让首页 / 分类页在 HTML 里直接带出内容，避免手机端依赖客户端 JS 拉接口导致白屏/长时间转圈。
// - enrich=false：列表本身已含封面与评分，不逐条补详情，显著提速。
// - 超时返回空数组：首屏该分类留空，但客户端「换一批」仍会补，不会卡死 SSR。
export async function prefetchContent(
  ct: ContentType,
  category: string,
  count = 20,
  timeoutMs = 5000
): Promise<{ items: NormalizedContent[]; isMock: boolean }> {
  const p = listContent(ct, category, 1, count, false);
  const timeout = new Promise<NormalizedContent[]>((resolve) => setTimeout(() => resolve([]), timeoutMs));
  const items = await Promise.race([p, timeout]);
  const isMock = items.length === 0 || items.every((i) => i.isMock);
  return { items, isMock };
}
