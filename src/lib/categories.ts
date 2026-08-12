import { ContentType } from "./types";

export interface CategoryDef {
  key: string; // 传给 listContent 的 category
  label: string;
}

// 各类型的浏览分类。注意：
//  - 真实数据源能映射的才给真实 key；不能精确映射的（如综艺子分类、纪录片子题材）
//    统一复用可用的真实/ mock 列表，并在交付文档中说明限制。
//  - 「根据我的口味推荐」由推荐引擎单独提供，不在此列。
export const CATEGORIES: Record<ContentType, CategoryDef[]> = {
  movie: [
    { key: "popular", label: "热门" },
    { key: "top_rated", label: "高评分" },
    { key: "upcoming", label: "最新" },
    { key: "genre:878", label: "科幻" },
    { key: "genre:28", label: "动作" },
    { key: "genre:35", label: "喜剧" },
    { key: "genre:9648", label: "悬疑" },
    { key: "genre:27", label: "恐怖" },
    { key: "genre:10749", label: "爱情" },
    { key: "genre:16", label: "动画" },
  ],
  tv: [
    { key: "popular", label: "热门" },
    { key: "top_rated", label: "高评分" },
    { key: "on_the_air", label: "最新" },
    { key: "genre:Action", label: "动作" },
    { key: "genre:Adventure", label: "冒险" },
    { key: "genre:Comedy", label: "喜剧" },
    { key: "genre:Drama", label: "剧情" },
    { key: "genre:Mystery", label: "悬疑" },
  ],
  anime: [
    { key: "popular", label: "热门" },
    { key: "score", label: "高评分" },
    { key: "new", label: "新番" },
    { key: "finished", label: "完结" },
    { key: "jp", label: "日本动漫" },
    { key: "cn", label: "国产动漫" },
    { key: "us", label: "欧美动画" },
  ],
  variety: [
    { key: "popular", label: "热门" },
    { key: "new", label: "最新" },
    { key: "top", label: "高评分" },
  ],
  documentary: [
    { key: "popular", label: "热门" },
    { key: "top", label: "高评分" },
    { key: "new", label: "最新" },
    { key: "nature", label: "自然" },
    { key: "history", label: "历史" },
    { key: "science", label: "科学" },
    { key: "humanity", label: "人文" },
    { key: "society", label: "社会" },
    { key: "sports", label: "体育" },
    { key: "food", label: "美食" },
  ],
  music: [
    { key: "popular", label: "全球热歌" },
    { key: "cn", label: "华语" },
    { key: "jp", label: "日韩" },
    { key: "us", label: "欧美" },
  ],
  mobile_game: [
    { key: "popular", label: "热门" },
    { key: "new", label: "最新" },
    { key: "hot", label: "高热度" },
    { key: "top", label: "高评分" },
    { key: "genre:rpg", label: "RPG" },
    { key: "genre:action", label: "动作" },
    { key: "genre:strategy", label: "策略" },
    { key: "genre:card", label: "卡牌" },
    { key: "genre:moba", label: "MOBA" },
    { key: "genre:shooter", label: "FPS" },
    { key: "genre:simulation", label: "模拟经营" },
    { key: "genre:open", label: "开放世界" },
    { key: "genre:anime", label: "二次元" },
  ],
  online_game: [
    { key: "popular", label: "热门" },
    { key: "genre:mmo", label: "MMORPG" },
    { key: "genre:shooter", label: "FPS" },
    { key: "genre:moba", label: "MOBA" },
    { key: "genre:strategy", label: "RTS" },
    { key: "genre:card", label: "卡牌" },
    { key: "genre:competitive", label: "竞技" },
    { key: "genre:survival", label: "生存" },
    { key: "genre:open", label: "开放世界" },
    { key: "genre:social", label: "社交" },
  ],
  single_player_game: [
    { key: "popular", label: "热门" },
    { key: "top", label: "高评分" },
    { key: "new", label: "新游戏" },
    { key: "genre:rpg", label: "RPG" },
    { key: "genre:action", label: "动作" },
    { key: "genre:adventure", label: "冒险" },
    { key: "genre:horror", label: "恐怖" },
    { key: "genre:survival", label: "生存" },
    { key: "genre:strategy", label: "策略" },
    { key: "genre:simulation", label: "模拟" },
    { key: "genre:open", label: "开放世界" },
    { key: "genre:indie", label: "独立游戏" },
  ],
};
