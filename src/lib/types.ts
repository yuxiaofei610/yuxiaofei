// 统一内容类型与常量

export const CONTENT_TYPES = [
  "movie",
  "tv",
  "anime",
  "variety",
  "documentary",
  "music",
  "mobile_game",
  "online_game",
  "single_player_game",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  movie: "电影",
  tv: "电视剧",
  anime: "动漫",
  variety: "综艺",
  documentary: "纪录片",
  music: "音乐",
  mobile_game: "手游",
  online_game: "网游",
  single_player_game: "单机游戏",
};

// 外部资源类型
export const RESOURCE_TYPES = [
  "bilibili",
  "cloud_drive",
  "anime_resource",
  "qq_music",
  "official",
  "steam",
  "app_store",
  "google_play",
  "epic",
  "playstation",
  "xbox",
  "nintendo",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

// 各内容类型允许的外部资源（来自需求文档第三十四条，严格执行）
export const ALLOWED_RESOURCES: Record<ContentType, ResourceType[]> = {
  movie: ["bilibili", "cloud_drive"],
  tv: ["bilibili", "cloud_drive"],
  anime: ["bilibili", "cloud_drive", "anime_resource"],
  variety: ["bilibili", "cloud_drive"],
  documentary: ["bilibili", "cloud_drive"],
  music: ["qq_music"],
  mobile_game: [],
  online_game: [],
  single_player_game: [],
};

// 归一化后的内容对象（适配器产出，尚未写入数据库主键）
export interface NormalizedContent {
  id: string; // 形如 "anilist:123" / "mock_movie:abc"
  contentType: ContentType;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  coverImage?: string | null;
  releaseDate?: string | null;
  rating?: number | null; // 0-10
  popularity?: number | null;
  language?: string | null;
  country?: string | null;
  genres: string[];
  tags: string[];
  externalId?: string | null;
  source: string;
  isMock: boolean;
  // 展示增强字段
  director?: string | null;        // 导演 / 主创
  imdbRating?: number | null;      // IMDb 评分（0-10），来自 OMDb
  // 专属字段
  artist?: string | null;
  album?: string | null;
  developer?: string | null;
  publisher?: string | null;
  platforms?: string[];
  // 推荐引擎给出的「为什么推荐」理由（仅推荐场景填充，浏览页不填）
  recommendReasons?: string[];
}

export const RATING_MAX = 10;
