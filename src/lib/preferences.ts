import { prisma } from "./prisma";
import { NormalizedContent } from "./types";

// 兴趣画像动态更新：根据行为强度调整类型/标签权重（非永久屏蔽）

const BOUND = 10;

async function bump(userId: string, kind: "genre" | "tag", key: string, delta: number): Promise<void> {
  const existing = await prisma.userPreference.findUnique({
    where: { userId_kind_key: { userId, kind, key } },
  });
  const next = Math.max(-BOUND, Math.min(BOUND, (existing?.weight ?? 0) + delta));
  await prisma.userPreference.upsert({
    where: { userId_kind_key: { userId, kind, key } },
    create: { userId, kind, key, weight: next },
    update: { weight: next },
  });
}

const DELTA = {
  like: 3,
  dislike: -3,
  watched: 1,
  played: 1,
  viewed: 0.3,
} as const;

export type BehaviorAction = keyof typeof DELTA;

export async function adjustFromBehavior(
  userId: string,
  content: NormalizedContent,
  action: BehaviorAction
): Promise<void> {
  const d = DELTA[action];
  // 不喜欢时，相关类型/标签降权（但不永久封禁整类）
  for (const g of content.genres) await bump(userId, "genre", g, d);
  for (const t of content.tags) await bump(userId, "tag", t, d);
}

// 首次兴趣选择：写入初始画像（正权重）
export async function applyInitialSelection(
  userId: string,
  selections: { genres: string[]; gameGenres: string[]; types: string[]; countries: string[] }
): Promise<void> {
  const all = [...selections.genres, ...selections.gameGenres];
  for (const g of all) await bump(userId, "genre", g, 4);
  // 内容类型偏好可作为 tag 维度记录（用于「根据我的口味」过滤倾向）
  for (const t of selections.types) await bump(userId, "tag", `type:${t}`, 2);
  for (const c of selections.countries) await bump(userId, "tag", `country:${c}`, 1);
}
