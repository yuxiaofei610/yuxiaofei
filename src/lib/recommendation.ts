import { prisma } from "./prisma";
import { ContentType, NormalizedContent } from "./types";
import { listContent } from "./adapters";

// 推荐引擎（独立模块，公式集中于此，前端不直接持有打分逻辑）
//
// 混合打分（第一阶段，参数可按测试调整）：
//   recommend_score =
//       genre_match      * 0.25
//     + tag_match        * 0.20
//     + user_behavior    * 0.20
//     + rating_score     * 0.10
//     + popularity_score * 0.10
//     + recency_score    * 0.10
//     + diversity_score  * 0.05
//
// 以后可升级：协同过滤 / Embedding / 向量数据库 / LLM。

export interface Profile {
  genres: Record<string, number>;
  tags: Record<string, number>;
  hasData: boolean;
}

const THIS_YEAR = new Date().getFullYear();

export async function getProfile(userId: string | null): Promise<Profile> {
  if (!userId) return { genres: {}, tags: {}, hasData: false };
  const prefs = await prisma.userPreference.findMany({ where: { userId } });
  const genres: Record<string, number> = {};
  const tags: Record<string, number> = {};
  let hasData = false;
  for (const p of prefs) {
    if (p.kind === "genre") { genres[p.key] = p.weight; if (p.weight !== 0) hasData = true; }
    else { tags[p.key] = p.weight; if (p.weight !== 0) hasData = true; }
  }
  return { genres, tags, hasData };
}

function positiveTotal(p: Profile): number {
  let s = 0;
  for (const v of Object.values(p.genres)) if (v > 0) s += v;
  for (const v of Object.values(p.tags)) if (v > 0) s += v;
  return s;
}

interface Scored {
  score: number;
  reasons: string[];
}

// 打分 + 生成「为什么推荐」理由（前端卡片展示）
function scoreAndReasons(c: NormalizedContent, p: Profile): Scored {
  const posTotal = positiveTotal(p) || 1;

  // genre / tag 匹配（命中正向权重）
  const matchedGenres: string[] = [];
  let gMatch = 0;
  for (const g of c.genres) if (p.genres[g] > 0) { gMatch += p.genres[g]; matchedGenres.push(g); }
  const matchedTags: string[] = [];
  let tMatch = 0;
  for (const t of c.tags) if (p.tags[t] > 0) { tMatch += p.tags[t]; matchedTags.push(t); }
  const genreMatch = Math.min(1, gMatch / posTotal);
  const tagMatch = Math.min(1, tMatch / posTotal);

  // 用户行为强度（已看/喜欢的内容类型命中程度，近似用正向权重总和占比）
  const userBehavior = Math.min(1, (gMatch + tMatch) / posTotal);

  // 评分 / 热度 / 新鲜度
  const ratingScore = c.rating != null ? Math.min(1, c.rating / 10) : 0.5;
  const popularityScore = c.popularity != null ? Math.min(1, Math.log10(c.popularity + 10) / 5) : 0.3;

  let recencyScore = 0.5;
  let releaseYear: number | null = null;
  if (c.releaseDate) {
    const y = parseInt(c.releaseDate, 10);
    if (!Number.isNaN(y)) { releaseYear = y; recencyScore = Math.max(0, Math.min(1, 1 - (THIS_YEAR - y) / 30)); }
  }

  // 多样性：命中负向权重的类型扣分，避免过度集中
  let diversityPenalty = 0;
  for (const g of c.genres) if (p.genres[g] < 0) diversityPenalty += Math.min(1, -p.genres[g] / 10);
  const diversityScore = Math.max(0, 1 - diversityPenalty);

  const reasons: string[] = [];

  // 冷启动：无画像时，提高评分与热度权重（用常量代替）
  if (!p.hasData) {
    if (ratingScore >= 0.8) reasons.push(`高口碑 ${c.rating?.toFixed(1)}`);
    if (popularityScore >= 0.6) reasons.push("人气热门");
    if (releaseYear != null && THIS_YEAR - releaseYear <= 3) reasons.push("新近作品");
    if (reasons.length === 0) reasons.push("热门精选");
    const score =
      ratingScore * 0.40 +
      popularityScore * 0.30 +
      recencyScore * 0.20 +
      diversityScore * 0.10;
    return { score, reasons };
  }

  // 预热：命中正向画像才给对应理由，避免无依据地堆标签
  const sortedG = matchedGenres.sort((a, b) => (p.genres[b] || 0) - (p.genres[a] || 0)).slice(0, 2);
  if (sortedG.length) reasons.push(`你偏爱「${sortedG.join("、")}」`);
  const sortedT = matchedTags.sort((a, b) => (p.tags[b] || 0) - (p.tags[a] || 0)).slice(0, 1);
  if (sortedT.length) reasons.push(`兴趣契合「${sortedT[0]}」`);
  if (sortedG.length === 0 && sortedT.length === 0 && diversityScore < 1) reasons.push("拓展新类型");
  if (ratingScore >= 0.85) reasons.push(`高分 ${c.rating?.toFixed(1)}`);
  else if (popularityScore >= 0.7) reasons.push("人气高");
  if (releaseYear != null && THIS_YEAR - releaseYear <= 2) reasons.push("近期新作");
  if (reasons.length === 0) reasons.push("综合推荐");

  const score =
    genreMatch * 0.25 +
    tagMatch * 0.20 +
    userBehavior * 0.20 +
    ratingScore * 0.10 +
    popularityScore * 0.10 +
    recencyScore * 0.10 +
    diversityScore * 0.05;
  return { score, reasons };
}

export interface RecommendResult {
  items: NormalizedContent[];
  profile: Profile;
  isColdStart: boolean;
}

// 获取候选集（跨多个分类，保证多样性），并分页以支持「换一批」
// contentType = "all" 时跨全部类型混合（用于首页「为你推荐」）
async function fetchCandidates(ct: ContentType | "all", page: number): Promise<NormalizedContent[]> {
  const types: ContentType[] = ct === "all"
    ? ["movie", "tv", "anime", "variety", "documentary", "music"]
    : [ct];
  const catsMap: Record<string, string[]> = {
    anime: ["popular", "score", "new"],
  };
  const all: NormalizedContent[] = [];
  for (const t of types) {
    const cats = catsMap[t] ?? ["popular", "top", "new"];
    const lists = await Promise.all(cats.map((c) => listContent(t, c, page).catch(() => [] as NormalizedContent[])));
    const map = new Map<string, NormalizedContent>();
    for (const l of lists) for (const it of l) if (!map.has(it.id)) map.set(it.id, it);
    all.push(...map.values());
  }
  return all;
}

export async function recommend(params: {
  userId: string | null;
  contentType: ContentType | "all";
  count?: number;
  source: string;
  page?: number;
}): Promise<RecommendResult> {
  const { userId, contentType, count = 20, source, page = 1 } = params;
  const profile = await getProfile(userId);

  // 排除：不喜欢的内容 + 最近在本 source 展示过的（换一批去重）
  const exclude = new Set<string>();
  if (userId) {
    const dis = await prisma.dislike.findMany({ where: { userId } });
    dis.forEach((d) => exclude.add(d.contentId));
    const recent = await prisma.recommendationHistory.findMany({
      where: { userId, source },
      orderBy: { shownAt: "desc" },
      take: 200,
    });
    recent.forEach((r) => exclude.add(r.contentId));
  }

  const candidates = await fetchCandidates(contentType, page);
  const scored = candidates
    .filter((c) => !exclude.has(c.id))
    .map((c) => {
      const r = scoreAndReasons(c, profile);
      return { c, s: r.score, reasons: r.reasons };
    })
    .sort((a, b) => b.s - a.s);

  // 首页混合推荐（contentType === "all"）跨类型轮转，避免结果被单一类型刷屏
  let picked: { c: NormalizedContent; s: number; reasons: string[] }[];
  if (contentType === "all") {
    const byType = new Map<string, { c: NormalizedContent; s: number; reasons: string[] }[]>();
    for (const x of scored) {
      const arr: { c: NormalizedContent; s: number; reasons: string[] }[] = byType.get(x.c.contentType) ?? [];
      arr.push(x);
      byType.set(x.c.contentType, arr);
    }
    picked = [];
    let progressed = true;
    while (picked.length < count && progressed) {
      progressed = false;
      for (const arr of byType.values()) {
        if (arr.length) { picked.push(arr.shift()!); progressed = true; if (picked.length >= count) break; }
      }
    }
    // 类型不足以填满时，用剩余高分补全
    if (picked.length < count) {
      for (const x of scored) if (!picked.includes(x)) { picked.push(x); if (picked.length >= count) break; }
    }
  } else {
    picked = scored.slice(0, count);
  }

  // 浅克隆并挂理由，避免污染适配器缓存的共享对象
  const items = picked.map((x) => {
    const cc: NormalizedContent = { ...x.c };
    cc.recommendReasons = x.reasons;
    return cc;
  });

  // 记录推荐历史（用于去重 / 统计 / 优化）
  if (userId && items.length) {
    await prisma.recommendationHistory
      .createMany({
        data: items.map((c) => ({ userId, contentId: c.id, source, action: null })),
      })
      .catch(() => {});
  }

  return { items, profile, isColdStart: !profile.hasData };
}
