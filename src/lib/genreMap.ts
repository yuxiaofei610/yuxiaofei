// 统一类型/标签词表：把各数据源的英文 genre 映射到平台统一的「中文规范词」，
// 以保证推荐系统的 genre_match 在跨数据源时一致（用户兴趣画像用中文维护）。
// 未匹配的保留原文。

const MAP: Record<string, string> = {
  // 通用影视
  Action: "动作",
  Adventure: "冒险",
  Comedy: "喜剧",
  Drama: "剧情",
  "Sci-Fi": "科幻",
  "Science Fiction": "科幻",
  Mystery: "悬疑",
  Horror: "恐怖",
  Thriller: "惊悚",
  Romance: "爱情",
  "Romantic": "爱情",
  Animation: "动画",
  Fantasy: "奇幻",
  Crime: "犯罪",
  War: "战争",
  Family: "家庭",
  History: "历史",
  Documentary: "纪录片",
  Music: "音乐",
  Musical: "音乐",
  // 动漫 / 影视常见
  "Slice of Life": "日常",
  Mecha: "机战",
  Sports: "运动",
  Supernatural: "超自然",
  "Martial Arts": "武侠",
  Ecchi: "擦边",
  "Kids": "儿童",
  // 游戏
  RPG: "RPG",
  "Role-Playing": "RPG",
  "Action-Adventure": "动作冒险",
  "Real Time Strategy": "策略",
  Strategy: "策略",
  "Card Game": "卡牌",
  MOBA: "MOBA",
  "Shooter": "射击",
  "First-Person": "FPS",
  "Open World": "开放世界",
  "Open-World": "开放世界",
  Simulation: "模拟",
  "Sandbox": "沙盒",
  "Indie": "独立游戏",
  "Massively Multiplayer": "MMO",
  "Platformer": "平台跳跃",
  Puzzle: "解谜",
  Racing: "竞速",
  Fighting: "格斗",
  "Turn-Based Strategy": "策略",
  "Visual Novel": "视觉小说",
};

export function normalizeGenre(g: string): string {
  const t = g.trim();
  return MAP[t] || t;
}

export function normalizeGenres(genres: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of genres) {
    const n = normalizeGenre(g);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

// 初始兴趣选择使用的规范词（用于冷启动）
export const INITIAL_GENRES = [
  "科幻", "悬疑", "动作", "恐怖", "动画", "爱情", "喜剧", "纪录片", "剧情", "冒险", "奇幻", "犯罪",
];
export const INITIAL_GAME_GENRES = [
  "RPG", "开放世界", "FPS", "策略", "模拟经营", "二次元", "卡牌", "MOBA", "动作", "独立游戏", "生存", "射击",
];
