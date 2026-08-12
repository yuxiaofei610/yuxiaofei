// 轻量服务端内存缓存（TTL）。生产环境可替换为 Redis。
// 用于缓存：热门内容 30~60 分钟、搜索 5~10 分钟、详情数小时。

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export const TTL = {
  hot: 45 * 60 * 1000, // 45 分钟
  search: 8 * 60 * 1000, // 8 分钟
  detail: 6 * 60 * 60 * 1000, // 6 小时
};
