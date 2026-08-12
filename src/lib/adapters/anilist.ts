import { NormalizedContent } from "../types";
import { normalizeGenres } from "../genreMap";

// AniList 真实数据源（无需 API Key，公开 GraphQL 接口）
// 文档: https://anilist.gitbook.io/anilist-apiv2-docs/
const ANILIST_URL = "https://graphql.anilist.co";

export type AniListSort = "POPULARITY_DESC" | "SCORE_DESC" | "START_DATE_DESC" | "TRENDING_DESC";

interface AniListMedia {
  id: number;
  idMal?: number | null;
  title?: { romaji?: string; english?: string; native?: string } | null;
  coverImage?: { large?: string; extraLarge?: string } | null;
  averageScore?: number | null;
  meanScore?: number | null;
  popularity?: number | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null } | null;
  genres?: string[] | null;
  tags?: { name: string; rank?: number }[] | null;
  description?: string | null;
  episodes?: number | null;
  duration?: number | null;
  format?: string | null;
  status?: string | null;
}

function mapMedia(m: AniListMedia): NormalizedContent {
  const title = m.title?.romaji || m.title?.english || m.title?.native || `Anime ${m.id}`;
  const original = m.title?.native && m.title?.native !== title ? m.title.native : null;
  const tags = (m.tags || [])
    .filter((t) => (t.rank ?? 0) >= 40)
    .slice(0, 6)
    .map((t) => t.name);
  return {
    id: `anilist:${m.id}`,
    contentType: "anime",
    title,
    originalTitle: original,
    description: m.description ? m.description.replace(/<[^>]+>/g, "") : null,
    coverImage: m.coverImage?.extraLarge || m.coverImage?.large || null,
    releaseDate: m.startDate?.year ? String(m.startDate.year) : m.seasonYear ? String(m.seasonYear) : null,
    rating: m.averageScore != null ? m.averageScore / 10 : null,
    popularity: m.popularity ?? null,
    language: "ja",
    country: "JP",
    genres: normalizeGenres(m.genres || []),
    tags,
    externalId: String(m.id),
    source: "anilist",
    isMock: false,
  };
}

async function anilistQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    // 网络请求设超时，避免挂起
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`AniList HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`AniList error: ${json.errors[0]?.message}`);
  }
  return json.data as T;
}

const LIST_FIELDS = `
  id idMal title { romaji english native }
  coverImage { large extraLarge }
  averageScore meanScore popularity seasonYear
  startDate { year } genres tags { name rank }
  description episodes duration format status
`;

// 动态构造查询：仅在提供时才加入 status / country / search 参数，绝对不传 null
// （AniList 对显式 null 的 enum 参数会返回空结果）
function buildListQuery(opts?: { status?: string; country?: string; search?: boolean }) {
  const args = ["type: ANIME", "sort: $sort"];
  const decl = ["$page: Int", "$perPage: Int", "$sort: [MediaSort]"];
  if (opts?.search) { args.push("search: $search"); decl.push("$search: String"); }
  if (opts?.status) { args.push("status: $status"); decl.push("$status: MediaStatus"); }
  if (opts?.country) { args.push("countryOfOrigin: $country"); decl.push("$country: CountryCode"); }
  return `query (${decl.join(", ")}) { Page(page: $page, perPage: $perPage) { media(${args.join(", ")}) { ${LIST_FIELDS} } } }`;
}

const DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id idMal title { romaji english native }
    coverImage { large extraLarge }
    averageScore meanScore popularity seasonYear
    startDate { year } genres tags { name rank }
    description episodes duration format status
  }
}`;

export async function fetchAnimeList(
  sort: AniListSort,
  page = 1,
  perPage = 20,
  opts?: { status?: string; country?: string }
): Promise<NormalizedContent[]> {
  const query = buildListQuery(opts);
  const variables: Record<string, unknown> = { page, perPage, sort: [sort] };
  if (opts?.status) variables.status = opts.status;
  if (opts?.country) variables.country = opts.country;
  const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(query, variables);
  return (data.Page.media || []).map(mapMedia);
}

export async function fetchAnimeSearch(query: string, page = 1, perPage = 20): Promise<NormalizedContent[]> {
  const q = buildListQuery({ search: true });
  const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(q, {
    page,
    perPage,
    sort: ["SEARCH_MATCH"],
    search: query,
  });
  return (data.Page.media || []).map(mapMedia);
}

export async function fetchAnimeDetail(id: string): Promise<NormalizedContent | null> {
  const numStr = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  const numId = parseInt(numStr, 10);
  if (Number.isNaN(numId)) return null;
  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(DETAIL_QUERY, { id: numId });
    if (!data.Media) return null;
    return mapMedia(data.Media);
  } catch {
    return null;
  }
}
