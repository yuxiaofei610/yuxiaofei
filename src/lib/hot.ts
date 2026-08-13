import { fetchVideoList } from "./adapters/douban";
import { fetchMusicList as fetchQqList } from "./adapters/qqmusic";
import { fetchAnimeList } from "./adapters/bangumi";
import { fetchRawgList } from "./adapters/rawg";

export interface HotItem {
  title: string;
  subtitle?: string;
  coverImage?: string | null;
  url?: string; // 外站跳转
  detailPath?: string; // 站内详情
}

export interface HotBoard {
  key: string;
  title: string;
  icon: string;
  items: HotItem[];
  moreUrl?: string;
  sourceLabel: string;
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 4000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    const r = await p;
    return r ?? fallback;
  } catch {
    return fallback;
  }
}

function videoItems(items: any[]): HotItem[] {
  return (items || [])
    .map((i) => ({
      title: i.title,
      subtitle: [i.releaseDate, i.rating ? `⭐${i.rating}` : ""].filter(Boolean).join(" · ") || undefined,
      coverImage: i.coverImage,
      detailPath: `/detail/${i.contentType}/${encodeURIComponent(i.id)}`,
    }))
    .slice(0, 10);
}

async function fetchBilibiliHot(limit = 10): Promise<HotItem[]> {
  const url = `https://api.bilibili.com/x/web-interface/popular?ps=${limit}&pn=1`;
  const json = await fetchJson(
    url,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Referer: "https://www.bilibili.com/",
      },
    },
    4000
  );
  const list: any[] = json?.data?.list || [];
  return list.slice(0, limit).map((v) => ({
    title: v.title,
    subtitle: v.owner?.name,
    coverImage: v.pic,
    url: "https://www.bilibili.com/video/" + (v.bvid || `av${v.aid}`),
  }));
}

export async function getHotBoards(): Promise<HotBoard[]> {
  const [movie, tv, anime, music, game, bili] = await Promise.all([
    safe(fetchVideoList("movie", "hot", 1, 10, false).then(videoItems), [] as HotItem[]),
    safe(fetchVideoList("tv", "hot", 1, 10, false).then(videoItems), [] as HotItem[]),
    safe(
      fetchAnimeList("popular", 1, 10).then((arr: any[]) =>
        arr.map((i): HotItem => ({
          title: i.title,
          subtitle: i.rating ? `⭐${i.rating}` : undefined,
          coverImage: i.coverImage,
          detailPath: `/detail/${i.contentType}/${encodeURIComponent(i.id)}`,
        }))
      ),
      [] as HotItem[]
    ),
    safe(
      fetchQqList("popular", 1, 10).then((arr: any[]) =>
        arr.map((i): HotItem => ({
          title: i.title,
          subtitle: i.artist || undefined,
          coverImage: i.coverImage,
          detailPath: `/detail/${i.contentType}/${encodeURIComponent(i.id)}`,
        }))
      ),
      [] as HotItem[]
    ),
    safe(
      fetchRawgList("single_player_game", "popular", 1).then((arr: any[]) =>
        arr.slice(0, 10).map((i): HotItem => ({
          title: i.title,
          subtitle: i.platforms?.join(" ") || undefined,
          coverImage: i.coverImage,
          detailPath: `/detail/${i.contentType}/${encodeURIComponent(i.id)}`,
        }))
      ),
      [] as HotItem[]
    ),
    safe(fetchBilibiliHot(10), [] as HotItem[]),
  ]);

  return [
    { key: "movie", title: "今日电影热榜", icon: "🎬", items: movie, moreUrl: "https://movie.douban.com/", sourceLabel: "豆瓣" },
    { key: "tv", title: "今日电视剧热榜", icon: "📺", items: tv, moreUrl: "https://tv.douban.com/", sourceLabel: "豆瓣" },
    { key: "anime", title: "今日动漫热榜", icon: "🌸", items: anime, moreUrl: "https://bangumi.tv/anime/browser", sourceLabel: "Bangumi" },
    { key: "music", title: "今日音乐热榜", icon: "🎵", items: music, moreUrl: "https://y.qq.com/", sourceLabel: "QQ音乐" },
    { key: "game", title: "今日游戏热榜", icon: "🎮", items: game, moreUrl: "https://store.steampowered.com/", sourceLabel: "RAWG" },
    { key: "bilibili", title: "B站热门", icon: "📡", items: bili, moreUrl: "https://www.bilibili.com/v/popular/all/", sourceLabel: "哔哩哔哩" },
  ];
}
