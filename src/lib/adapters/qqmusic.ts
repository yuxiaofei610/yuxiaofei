import { NormalizedContent } from "../types";
import { cacheGet, cacheSet, TTL } from "../cache";

// QQ音乐 华语歌曲数据源（best-effort）。
// QQ音乐无开放 API：toplist / search 接口需伪造 Referer: https://y.qq.com/ 绕过，
// 部分接口还可能需要 sign 签名（密钥会轮换）。本实现以 toplist(topid=26 华语热歌) 为主，
// 失败时由 index.ts 回退 Douban / iTunes 华语榜。服务端 fetch 绕过 CORS；限流/ToS 为已知风险。
const C_YQQ = "https://c.y.qq.com";

async function qqGet(path: string): Promise<any> {
  const url = C_YQQ + path;
  const res = await fetch(url, {
    headers: {
      Referer: "https://y.qq.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("QQMusic HTTP " + res.status);
  const txt = await res.text();
  let json: any;
  try {
    json = JSON.parse(txt);
  } catch (e) {
    throw new Error("QQMusic non-json");
  }
  return json;
}

function coverFromMid(albummid?: string): string | null {
  if (!albummid) return null;
  return "https://y.gtimg.cn/music/photo_new/T002R300x300M000" + albummid + ".jpg";
}

function singerName(singers?: any[]): string | null {
  if (!Array.isArray(singers) || singers.length === 0) return null;
  return singers.map((s) => s.name).join("/");
}

function mapSong(d: any): NormalizedContent {
  const songmid = d.songmid || d.musicid;
  return {
    id: "qqmusic:" + songmid,
    contentType: "music",
    title: d.songname || d.title || "未知歌曲",
    originalTitle: null,
    description: null,
    coverImage: coverFromMid(d.albummid) || null,
    releaseDate: null,
    rating: null,
    popularity: null,
    language: null,
    country: null,
    genres: [],
    tags: [],
    externalId: songmid,
    source: "qqmusic",
    isMock: false,
    artist: singerName(d.singer),
    album: d.albumname || null,
  };
}

export async function fetchMusicList(category: string, page = 1, perPage = 20): Promise<NormalizedContent[]> {
  const cacheKey = "qqmusic:list:" + category + ":" + page + ":" + perPage;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const topid = category === "hk" ? 27 : category === "us" ? 28 : 26;
  const data = await qqGet(
    "/v8/fcg-bin/fcg_v8_toplist_cp.fcg?tpl=3&page=detail&date=&topid=" + topid + "&type=top&song_begin=" + (page - 1) * perPage + "&song_num=" + perPage + "&format=json"
  );
  const list = data && data.songlist ? data.songlist : [];
  const items = list
    .map((s: any) => mapSong(s.data))
    .filter((x: NormalizedContent) => x.title !== "未知歌曲");
  if (items.length === 0) throw new Error("empty");
  cacheSet(cacheKey, items, TTL.hot);
  return items;
}

export async function fetchMusicSearch(query: string): Promise<NormalizedContent[]> {
  const cacheKey = "qqmusic:search:" + query;
  const hit = cacheGet<NormalizedContent[]>(cacheKey);
  if (hit) return hit;
  const data = await qqGet(
    "/soso/fcgi-bin/client_search_cp.fcg?w=" + encodeURIComponent(query) + "&format=json&p=1&n=20"
  );
  const list = data && data.data && data.data.song ? data.data.song.list : [];
  const items = list.map(mapSong).slice(0, 20);
  if (items.length === 0) throw new Error("empty");
  cacheSet(cacheKey, items, TTL.search);
  return items;
}

export async function fetchMusicDetail(id: string): Promise<NormalizedContent | null> {
  const mid = id.indexOf(":") >= 0 ? id.slice(id.lastIndexOf(":") + 1) : id;
  const cacheKey = "qqmusic:detail:" + mid;
  const hit = cacheGet<NormalizedContent | null>(cacheKey);
  if (hit !== undefined) return hit;
  try {
    const data = await qqGet(
      "/soso/fcgi-bin/client_search_cp.fcg?w=" + encodeURIComponent(mid) + "&format=json&p=1&n=1"
    );
    const s = data && data.data && data.data.song && data.data.song.list ? data.data.song.list[0] : null;
    const c = s ? mapSong(s) : null;
    cacheSet(cacheKey, c, TTL.detail);
    return c;
  } catch (e) {
    return null;
  }
}
