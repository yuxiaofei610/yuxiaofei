import { ContentType, NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";
import { fetchAnimeList, fetchAnimeSearch, fetchAnimeDetail } from "./bangumi";
import { fetchTmdbList, fetchTmdbSearch, fetchTmdbDetail, TmdbNoKeyError } from "./tmdb";
import { fetchRawgList, fetchRawgSearch, fetchRawgDetail, RawgNoKeyError } from "./rawg";
import { fetchItunesList, fetchItunesSearch, fetchItunesDetail } from "./itunes";
import { fetchMusicList, fetchMusicSearch, fetchMusicDetail, fetchVideoList, fetchVideoDetail } from "./douban";
import { fetchMusicList as fetchQqList, fetchMusicSearch as fetchQqSearch, fetchMusicDetail as fetchQqDetail } from "./qqmusic";
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
  perPage = 20
): Promise<NormalizedContent[]> {
  const cacheKey = "list:" + ct + ":" + category + ":" + page + ":" + perPage;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  let result: NormalizedContent[];
  try {
    if (ct === "anime") {
      result = await fetchAnimeList(category, page, perPage);
    } else if (ct === "movie" || ct === "tv" || ct === "variety" || ct === "documentary") {
      try {
        result = await fetchVideoList(ct, category, page, perPage);
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

  cacheSet(cacheKey, result, TTL.hot);
  return result;
}

export async function searchContent(query: string, ct?: ContentType): Promise<NormalizedContent[]> {
  const cacheKey = "search:" + (ct ?? "all") + ":" + query;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;

  const types: ContentType[] = ct
    ? [ct]
    : ["movie", "tv", "anime", "variety", "documentary", "music", "mobile_game", "online_game", "single_player_game"];
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
  const cacheKey = "detail:" + ct + ":" + id;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;

  let result: NormalizedContent | null = null;
  const ext = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  try {
    if (ct === "anime") result = await fetchAnimeDetail(ext);
    else if (ct === "movie" || ct === "tv" || ct === "variety" || ct === "documentary") {
      result = await fetchVideoDetail(ext, ct);
      if (!result) {
        const tmdbType: "movie" | "tv" = ct === "tv" ? "tv" : "movie";
        result = await fetchTmdbDetail(tmdbType, ext);
        if (!result) result = mockDetail(id);
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

  cacheSet(cacheKey, result, TTL.detail);
  return result;
}
