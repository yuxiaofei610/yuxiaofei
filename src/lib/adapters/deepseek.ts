// DeepSeek 文本模型封装。
// 作用边界（重要）：DeepSeek 是文本大模型，不能返回/生成图片，也不能可靠地"猜"出海报 URL。
// 在本项目里它只做一个事：把中文影视名翻译成更适合在 TMDB/IMDb 搜索的英文关键词，
// 从而提高"按片名补全封面"的命中率。真正的封面来自 TMDB 图片接口。
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";

function key(): string | null {
  return process.env.DEEPSEEK_API_KEY || null;
}

export function deepseekEnabled(): boolean {
  return !!key();
}

// 让 DeepSeek 把任意语言的影视名，转成用于英文资料库（TMDB/IMDb）搜索的最佳英文关键词。
// 返回 null 表示未配置 key 或调用失败，调用方应降级到原片名直接搜索。
export async function translateToSearchQuery(title: string, originalTitle?: string | null): Promise<string | null> {
  const k = key();
  if (!k || !title) return null;
  const sys =
    "You translate movie/TV show titles into the best English search keyword for Western databases like TMDB/IMDb. " +
    "Return ONLY the English title or transliteration, no quotes, no explanation, no punctuation. " +
    "If the title is already English/romanized, return it as-is. If multiple candidates exist, return the most internationally known one.";
  const user = `Title: ${title}${originalTitle ? `\nOriginal title: ${originalTitle}` : ""}`;
  try {
    const res = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_tokens: 32,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return text.replace(/["'`]/g, "").slice(0, 80);
  } catch {
    return null;
  }
}

export interface ReasonItem {
  id: string;
  title: string;
  type: string;
  genres: string[];
  artist?: string | null;
}

// 让 DeepSeek 为「为你推荐」批量生成个性化「为什么推荐」理由。
// 一次性提交候选列表，返回 { [id]: 理由[] }，避免逐条调用超时。
// 返回 null 表示未配置 key / 调用失败 / 解析失败，调用方应保留规则引擎理由。
export async function generateRecommendReasons(
  items: ReasonItem[],
  profileSummary: string
): Promise<Record<string, string[]> | null> {
  const k = key();
  if (!k || items.length === 0) return null;
  const sys =
    "你是中文娱乐推荐助手。用户有个性化偏好。针对每部作品，用一句中文（不超过 18 字）说明为什么推荐给这位用户，" +
    "要具体、结合其偏好（如类型、歌手），不要泛泛而谈。\n" +
    "只输出一个 JSON 对象，格式为 {\"reasons\": [理由1, 理由2, ...]}，数组顺序与输入作品严格一致，每项是一个字符串。不要任何解释、不要 markdown。";
  const payload = items.map((i) => ({
    id: i.id,
    title: i.title,
    type: i.type,
    genres: i.genres,
    artist: i.artist || null,
  }));
  const user = `用户偏好：${profileSummary || "（新用户，无明确偏好）"}\n作品列表：\n${JSON.stringify(payload)}`;
  try {
    const res = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_tokens: 600,
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
    const arr = Array.isArray(parsed) ? parsed : (parsed as { reasons?: unknown })?.reasons;
    if (!Array.isArray(arr)) return null;
    const out: Record<string, string[]> = {};
    items.forEach((it, idx) => {
      const r = arr[idx];
      const reason = Array.isArray(r) ? r[0] : r;
      if (typeof reason === "string" && reason.trim()) out[it.id] = [reason.trim()];
    });
    return out;
  } catch {
    return null;
  }
}
