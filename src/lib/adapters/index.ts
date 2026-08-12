import { ContentType, NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";
import { fetchAnimeList, fetchAnimeSearch, fetchAnimeDetail, AniListSort } from "./anilist";
import { fetchTmdbList, fetchTmdbSearch, fetchTmdbDetail, TmdbNoKeyError } from "./tmdb";
import { fetchRawgList, fetchRawgSearch, fetchRawgDetail, RawgNoKeyError } from "./rawg";
import { fetchTvmazeList, fetchTvmazeSearch, fetchTvmazeDetail } from "./tvmaze";
import { fetchItunesList, fetchItunesSearch, fetchItunesDetail } from "./itunes";
import { mockList, mockSearch, mockDetail } from "./mock";

// ===== 分类 → 数据源参数 映射 =====

function animeParams(category: string): { sort: AniListSort; opts?: { status?: string; country?: string } } {
  switch (category) {
    case "score": return { sort: "SCORE_DESC" };
    case "new": return { sort: "START_DATE_DESC" };
    case "trending": return { sort: "TRENDING_DESC" };
    case "finished": return { sort: "POPULARITY_DESC", opts: { status: "FINISHED" } };
    case "jp": return { sort: "POPULARITY_DESC", opts: { country: "JP" } };
    case "cn": return { sort: "POPULARITY_DESC", opts: { country: "CN" } };
    case "us": return { sort: "POPULARITY_DESC", opts: { country: "US" } };
    case "popular":
    default: return { sort: "POPULARITY_DESC" };
  }
}

// 把各类型子分类映射到 RAWG 的 genre slug（仅在配置了 RAWG Key 时生效）
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

// TVmaze 排序映射（top_rated/top → 评分；on_the_air/new → 最新；其余 → 热度 weight）
function tvmazeSort(category: string): "weight" | "rating" | "new" {
  if (category === "top_rated" || category === "top") return "rating";
  if (category === "on_the_air" || category === "new") return "new";
  return "weight";
}

// TVmaze type 字段过滤（纪录片/综艺用 type，电视剧用不到则 undefined）。
function tvmazeTypes(ct: ContentType): string[] | undefined {
  if (ct === "documentary") return ["Documentary"];
  if (ct === "variety") return ["Reality", "Talk Show", "Game Show"];
  return undefined;
}

// 把分类 key 映射到 TVmaze 的 genre 过滤（仅纪录片子题材需要）。
// TVmaze 的 /shows 索引里没有单一 "Documentary" genre，纪录片按题材打标签
// （Nature / History / Science-Fiction / Sports / Food 等，如《行星地球》= Nature）。
function tvmazeGenres(ct: ContentType, category: string): string[] | undefined {
  if (ct === "documentary") {
    const m: Record<string, string[]> = {
      nature: ["Nature"],
      history: ["History"],
      science: ["Science-Fiction"],
      sports: ["Sports"],
      food: ["Food"],
    };
    // 热门/高评分/最新/人文/社会：TVmaze 无更细分类，展示纪录片题材合集
    return m[category] || ["Nature", "History", "Science-Fiction", "Sports", "Food"];
  }
  if (ct === "tv") {
    const m: Record<string, string[]> = {
      "genre:Action": ["Action"],
      "genre:Adventure": ["Adventure"],
      "genre:Comedy": ["Comedy"],
      "genre:Drama": ["Drama"],
      "genre:Mystery": ["Mystery", "Thriller", "Crime"],
    };
    return m[category]; // 热门/最新/高评分 返回 undefined → 不过滤，按 weight/rating/日期排序
  }
  return undefined;
}

function tmdbCt(ct: ContentType): "movie" | "tv" | "documentary" {
  if (ct === "tv") return "tv";
  if (ct === "documentary") return "documentary";
  return "movie";
}

// ===== 对外主接口 =====

export async function listContent(
  ct: ContentType,
  category: string,
  page = 1,
  perPage = 20
): Promise<NormalizedContent[]> {
  const cacheKey = `list:${ct}:${category}:${page}:${perPage}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  let result: NormalizedContent[];
  try {
    if (ct === "anime") {
      const p = animeParams(category);
      result = await fetchAnimeList(p.sort, page, perPage, p.opts);
    } else if (ct === "tv" || ct === "variety" || ct === "documentary") {
      // TVmaze 免 Key 真实数据
      result = await fetchTvmazeList({
        contentType: ct,
        genres: tvmazeGenres(ct, category),
        types: tvmazeTypes(ct),
        sort: tvmazeSort(category),
        page,
        perPage,
      }).catch(() => mockList(ct, category, page, perPage));
    } else if (ct === "music") {
      // iTunes 免 Key 真实音乐数据
      result = await fetchItunesList(category, page, perPage).catch(() => mockList(ct, category, page, perPage));
    } else if (ct === "movie") {
      try {
        result = await fetchTmdbList(tmdbCt(ct), category, page);
        if (result.length === 0) throw new Error("empty");
      } catch (e) {
        if (e instanceof TmdbNoKeyError) {
          result = mockList(ct, category, page, perPage);
        } else {
          result = mockList(ct, category, page, perPage);
        }
      }
    } else if (ct === "mobile_game" || ct === "online_game" || ct === "single_player_game") {
      try {
        const g = rawgGenreSlug(category);
        result = await fetchRawgList(ct, g ? `genre:${g}` : category, page);
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

  cacheSet(cacheKey, result, TTL.hot);
  return result;
}

export async function searchContent(query: string, ct?: ContentType): Promise<NormalizedContent[]> {
  const cacheKey = `search:${ct ?? "all"}:${query}`;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  const types: ContentType[] = ct ? [ct] : ["movie", "tv", "anime", "variety", "documentary", "music", "mobile_game", "online_game", "single_player_game"];
  const out: NormalizedContent[] = [];

  await Promise.all(
    types.map(async (t) => {
      try {
        let items: NormalizedContent[] = [];
        if (t === "anime") items = await fetchAnimeSearch(query);
        else if (t === "tv" || t === "variety" || t === "documentary") items = await fetchTvmazeSearch(query, t);
        else if (t === "music") items = await fetchItunesSearch(query);
        else if (t === "movie") {
          try { items = await fetchTmdbSearch(t, query); } catch (e) { if (e instanceof TmdbNoKeyError) items = mockSearch(t, query); }
        } else if (t === "mobile_game" || t === "online_game" || t === "single_player_game") {
          try { items = await fetchRawgSearch(query); } catch (e) { if (e instanceof RawgNoKeyError) items = mockSearch(t, query); }
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

export async function getDetail(ct: ContentType, id: string): Promise<NormalizedContent | null> {
  const cacheKey = `detail:${ct}:${id}`;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;

  let result: NormalizedContent | null = null;
  // 提取外部数字 id（如 "anilist:16498" -> "16498"），mock id 仍传完整值
  const ext = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  try {
    if (ct === "anime") result = await fetchAnimeDetail(ext);
    else if (ct === "tv" || ct === "variety" || ct === "documentary") result = await fetchTvmazeDetail(ext, ct);
    else if (ct === "music") result = await fetchItunesDetail(ext);
    else if (ct === "movie") {
      try { result = await fetchTmdbDetail(ct, ext); } catch { result = null; }
      if (!result) result = mockDetail(id);
    } else if (ct === "mobile_game" || ct === "online_game" || ct === "single_player_game") {
      try { result = await fetchRawgDetail(ext); } catch { result = null; }
      if (!result) result = mockDetail(id);
    } else {
      result = mockDetail(id);
    }
  } catch {
    result = mockDetail(id);
  }

  cacheSet(cacheKey, result, TTL.detail);
  return result;
}
