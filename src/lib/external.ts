import { ALLOWED_RESOURCES, NormalizedContent, ResourceType } from "./types";

// 外部资源入口生成。严格遵循需求文档第三十四~三十八条：
//  - 一律只提供「首页入口」或「搜索入口」，绝不伪造具体作品 URL / 视频 ID。
//  - isVerified 仅在确认真实、可验证的具体链接时才为 true；搜索/首页入口一律 false。

export interface ExternalResourceLink {
  resourceType: ResourceType;
  url: string;
  title: string;
  isVerified: boolean;
}

function enc(s: string): string {
  return encodeURIComponent(s);
}

// Bilibili：始终用搜索入口（不伪造视频 ID）
function bilibiliSearch(title: string): ExternalResourceLink {
  return {
    resourceType: "bilibili",
    url: `https://search.bilibili.com/all?keyword=${enc(title)}`,
    title: "Bilibili 搜索",
    isVerified: false,
  };
}

// 网盘：固定入口（不猜测具体资源 URL）
function cloudDrive(): ExternalResourceLink {
  return {
    resourceType: "cloud_drive",
    url: "https://yx.zerovv.top/",
    title: "网盘",
    isVerified: false,
  };
}

// 动漫资源：固定入口（未验证搜索规则，不猜测 URL）
function animeResource(): ExternalResourceLink {
  return {
    resourceType: "anime_resource",
    url: "https://m.ezdmw.org/",
    title: "动漫资源",
    isVerified: false,
  };
}

// QQ音乐：搜索入口（不伪造具体歌曲 URL）
function qqMusicSearch(title: string): ExternalResourceLink {
  return {
    resourceType: "qq_music",
    url: `https://y.qq.com/n/ryqq/search?w=${enc(title)}`,
    title: "QQ音乐",
    isVerified: false,
  };
}

// 今日热榜：固定入口
export const TOPHUB_LINK: ExternalResourceLink = {
  resourceType: "official",
  url: "https://tophub.today/",
  title: "查看今日热榜",
  isVerified: false,
};

// 游戏平台链接：仅当真实数据源提供了可验证 URL 时才加（来自 RAWG 的 website / stores）
export function gamePlatformLinks(c: NormalizedContent): ExternalResourceLink[] {
  const out: ExternalResourceLink[] = [];
  if (c.source === "rawg" && c.externalId) {
    // RAWG 详情页（真实、可验证）
    out.push({
      resourceType: "official",
      url: `https://rawg.io/games/${c.externalId}`,
      title: "RAWG 详情",
      isVerified: true,
    });
  }
  if (c.developer || c.publisher) {
    // 官网仅在确有 website 时由适配器写入 externalResources，这里不臆造
  }
  return out;
}

// 根据内容类型，生成允许的外部资源入口
export function buildExternalLinks(c: NormalizedContent): ExternalResourceLink[] {
  const allowed = ALLOWED_RESOURCES[c.contentType] ?? [];
  const out: ExternalResourceLink[] = [];

  if (allowed.includes("bilibili")) out.push(bilibiliSearch(c.title));
  if (allowed.includes("cloud_drive")) out.push(cloudDrive());
  if (allowed.includes("anime_resource")) out.push(animeResource());
  if (allowed.includes("qq_music")) out.push(qqMusicSearch(c.title));

  if (c.contentType === "mobile_game" || c.contentType === "online_game" || c.contentType === "single_player_game") {
    out.push(...gamePlatformLinks(c));
  }

  return out;
}
