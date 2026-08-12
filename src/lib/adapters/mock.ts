import { ContentType, NormalizedContent } from "../types";

// 标注 MOCK 的占位数据。仅在「对应真实数据源未配置 API Key」时使用。
// 所有产出 isMock=true，前端会明确展示「MOCK DATA」徽标，不会冒充真实数据。

// 简单可复现伪随机（按 contentType+category+page+index 变化，保证换一批能拿到不同内容）
function seeded(seedStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const POOLS: Record<ContentType, { titles: string[]; genres: string[][]; tags: string[][] }> = {
  movie: {
    titles: ["星际残响", "暗夜追凶", "城市边缘", "时光裂痕", "无声证词", "炽热黎明", "深海回响", "最后航班", "镜中之城", "迷雾剧场"],
    genres: [["科幻", "悬疑"], ["动作", "犯罪"], ["剧情", "爱情"], ["恐怖", "悬疑"], ["喜剧", "剧情"], ["动画", "奇幻"], ["纪录片", "历史"]],
    tags: [["太空", "未来"], ["推理", "反转"], ["都市", "成长"], ["惊悚", "心理"], ["搞笑", "温情"]],
  },
  tv: {
    titles: ["长夜将明", "猎罪图鉴II", "山海之间", "都市迷踪", "急诊前线", "宫廷秘辛", "少年派对", "暗流", "归途", "浮城"],
    genres: [["剧情", "悬疑"], ["犯罪", "动作"], ["爱情", "喜剧"], ["纪录片", "历史"], ["科幻", "冒险"]],
    tags: [["悬疑", "探案"], ["职场", "现实"], ["甜宠", "轻松"], ["历史", "权谋"]],
  },
  anime: {
    titles: ["幻境彼端", "剑与誓约", "夏日重启", "异界食堂", "机甲黎明", "魔法事务所", "青春进行曲", "末日列车", "星海歌姬", "妖怪杂货铺"],
    genres: [["动画", "奇幻"], ["动作", "冒险"], ["日常", "喜剧"], ["科幻", "机战"], ["爱情", "剧情"]],
    tags: [["热血", "冒险"], ["治愈", "日常"], ["战斗", "成长"], ["恋爱", "校园"]],
  },
  variety: {
    titles: ["欢乐大冲关", "声临其境", "极限挑战X", "种地吧少年", "密室逃脱纪", "歌手2026", "喜剧 open mic", "拜托了冰箱", "向往的生活", "戏剧新生活"],
    genres: [["综艺", "真人秀"], ["音乐", "综艺"], ["竞技", "综艺"], ["访谈", "综艺"]],
    tags: [["搞笑", "游戏"], ["竞演", "舞台"], ["户外", "挑战"]],
  },
  documentary: {
    titles: ["地球脉动·极地", "文明的轨迹", "舌尖之外", "宇宙简史", "深海之下", "迁徙的鸟II", "工厂密码", "人体奥秘", "战壕里的光", "风味实验室"],
    genres: [["纪录片", "自然"], ["纪录片", "历史"], ["纪录片", "科学"], ["纪录片", "人文"], ["纪录片", "美食"]],
    tags: [["自然", "动物"], ["历史", "考古"], ["科普", "宇宙"], ["美食", "文化"]],
  },
  music: {
    titles: ["夜色温柔", "逆光奔跑", "城市霓虹", "山海谣", "电子脉冲", "民谣日记", "破晓", "潮汐", "孤勇者II", "星轨"],
    genres: [["流行", "华语"], ["摇滚", "独立"], ["电子", "舞曲"], ["民谣", "治愈"], ["说唱", "潮流"]],
    tags: [["抒情", "夜晚"], ["燃", "励志"], ["节奏", "派对"]],
  },
  mobile_game: {
    titles: ["幻塔纪元", "放置英雄", "原野之旅", "卡牌远征", "弹球大冒险", "像素勇者", "星界契约", "指尖三国", "迷宫物语", "机甲突击"],
    genres: [["RPG", "二次元"], ["卡牌", "策略"], ["模拟经营", "休闲"], ["动作", "射击"], ["开放世界", "冒险"]],
    tags: [["养成", "抽卡"], ["策略", "塔防"], ["放置", "挂机"]],
  },
  online_game: {
    titles: ["苍穹 Online", "战旗军团", "永恒之塔II", "枪火边境", "幻想大陆", "星际征服", "竞技王座", "江湖online", "末日生存网游", "联盟争霸"],
    genres: [["MMO", "RPG"], ["MOBA", "竞技"], ["FPS", "射击"], ["策略", "生存"], ["开放世界", "社交"]],
    tags: [["团战", "公会"], ["排位", "对抗"], ["开放", "探索"]],
  },
  single_player_game: {
    titles: ["孤岛余生", "暗影猎手", "时空旅人", "森林小屋", "驾驶俱乐部", "解谜画廊", "废土拾荒", "骑士之道", "像素地牢", "星海孤航"],
    genres: [["RPG", "冒险"], ["动作", "恐怖"], ["独立游戏", "解谜"], ["生存", "模拟"], ["开放世界", "策略"]],
    tags: [["剧情", "选择"], ["硬核", "挑战"], ["治愈", "休闲"]],
  },
};

function makeItem(ct: ContentType, category: string, page: number, idx: number): NormalizedContent {
  const pool = POOLS[ct];
  const r = seeded(`${ct}:${category}:${page}:${idx}`);
  const r2 = seeded(`${ct}:${category}:${page}:${idx}:b`);
  const title = pool.titles[(idx + page * 3) % pool.titles.length] + (page > 1 ? ` ${page}-${idx + 1}` : "");
  const genres = pool.genres[Math.floor(r * pool.genres.length)];
  const tags = pool.tags[Math.floor(r2 * pool.tags.length)];
  const year = 2015 + Math.floor(r * 12);
  const rating = Math.round((5.5 + r * 4.4) * 10) / 10;
  const popularity = Math.round(1000 + r2 * 9000);
  const base: NormalizedContent = {
    id: `mock_${ct}:${category}:${page}:${idx}`,
    contentType: ct,
    title,
    originalTitle: null,
    description: `（MOCK 占位简介）这是一条用于界面与推荐逻辑联调的示例数据，不代表真实作品。配置对应数据源 API Key 后将自动替换为真实内容。`,
    coverImage: null,
    releaseDate: String(year),
    rating,
    popularity,
    language: "zh",
    country: "CN",
    genres,
    tags,
    externalId: null,
    source: "mock",
    isMock: true,
  };
  if (ct === "music") {
    base.artist = ["林夕", "陈奕", "苏菲", "雷雨", "周野"][Math.floor(r * 5)];
    base.album = title + " · 单曲";
  }
  if (ct === "mobile_game" || ct === "online_game" || ct === "single_player_game") {
    base.developer = ["幻境工作室", "星核互娱", "像素工坊", "苍穹游戏"][Math.floor(r * 4)];
    base.publisher = base.developer;
    base.platforms = ct === "mobile_game" ? ["iOS", "Android"] : ["PC", "PlayStation"];
  }
  return base;
}

export function mockList(ct: ContentType, category: string, page = 1, perPage = 20): NormalizedContent[] {
  const n = Math.min(perPage, 20);
  return Array.from({ length: n }, (_, i) => makeItem(ct, category, page, i));
}

export function mockSearch(ct: ContentType, query: string): NormalizedContent[] {
  // 在 MOCK 池中做包含匹配；无匹配则基于 query 生成
  const pool = POOLS[ct];
  const matched = pool.titles
    .map((t, i) => makeItem(ct, "search", 1, i))
    .filter((c) => c.title.includes(query) || query.includes(c.title.slice(0, 2)));
  if (matched.length) return matched;
  const item = makeItem(ct, "search", 1, 0);
  item.title = query;
  return [item];
}

export function mockDetail(id: string): NormalizedContent | null {
  // MOCK id 形如 mock_<ct>:<cat>:<page>:<idx>
  // 非 MOCK id（如 tmdb:123）在缺少 Key 时兜底，避免崩溃
  const parts = id.split(":");
  const ctRaw = parts[0].replace("mock_", "");
  if (!(ctRaw in POOLS)) {
    return {
      id,
      contentType: "movie",
      title: id,
      description: "（无法还原详情：对应真实数据源未配置 API Key，或内容已下线）",
      coverImage: null,
      releaseDate: null,
      rating: null,
      popularity: null,
      genres: [],
      tags: [],
      externalId: null,
      source: "mock",
      isMock: true,
    };
  }
  const ct = ctRaw as ContentType;
  const page = parseInt(parts[2], 10) || 1;
  const idx = parseInt(parts[3], 10) || 0;
  const category = parts[1] || "popular";
  return makeItem(ct, category, page, idx);
}
