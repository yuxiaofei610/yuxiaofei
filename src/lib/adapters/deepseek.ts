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
