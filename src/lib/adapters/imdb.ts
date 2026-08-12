// IMDb 评分获取（仅影视类：电影 / 电视剧 / 综艺 / 纪录片）。
// 豆瓣接口不含 IMDb 字段，且无密钥直爬 IMDb 会被 Cloudflare 拦截，
// 因此统一走 OMDb API（https://www.omdbapi.com，免费 key，需配置 OMDB_API_KEY）。
// 未配置 key 时 fetchImdbRating 直接返回 null，由调用方优雅降级（只显示豆瓣评分）。

const OMDB = "https://www.omdbapi.com/";

// 进程内短缓存，避免同一标题短时间内重复打 OMDb（尊重 1000 次/日免费额度）。
const mem = new Map<string, number | null>();

function race<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

export async function fetchImdbRating(title: string, year?: string | null): Promise<number | null> {
  const t = (title || "").trim();
  if (!t) return null;
  const key = t.toLowerCase() + "|" + (year || "");
  if (mem.has(key)) return mem.get(key)!;

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    mem.set(key, null);
    return null;
  }

  const q = new URLSearchParams({ t, apikey: apiKey });
  if (year) q.set("y", String(year));

  try {
    const res = await race(
      fetch(`${OMDB}?${q.toString()}`, { signal: AbortSignal.timeout(3500) }),
      4000
    );
    if (!res.ok) {
      mem.set(key, null);
      return null;
    }
    const d = await res.json();
    if (d && d.Response === "True" && d.imdbRating && d.imdbRating !== "N/A") {
      const r = parseFloat(d.imdbRating);
      if (!Number.isNaN(r)) {
        mem.set(key, r);
        return r;
      }
    }
  } catch {
    /* 网络/限流/超时：静默降级 */
  }
  mem.set(key, null);
  return null;
}

// 批量填充：原地写入 items[].imdbRating，失败项保持 null。
export async function attachImdbRatings(items: { title: string; originalTitle?: string | null; releaseDate?: string | null; imdbRating?: number | null }[]): Promise<void> {
  if (!process.env.OMDB_API_KEY) return;
  await Promise.all(
    items.map(async (it) => {
      const t = it.originalTitle || it.title;
      const y = it.releaseDate ? it.releaseDate.slice(0, 4) : null;
      const r = await fetchImdbRating(t, y).catch(() => null);
      if (r != null) it.imdbRating = r;
    })
  );
}
