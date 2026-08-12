# 悦荐 · 综合娱乐与游戏个性化推荐平台

一个**真正联网**的娱乐与游戏推荐网站：电影 / 电视剧 / 动漫 / 综艺 / 纪录片 / 音乐 + 手游 / 网游 / 单机游戏。  
根据用户行为（已看、已玩、喜欢、不喜欢、搜索、换一批）动态建立兴趣画像，给出个性化推荐。

> ·演示版已部署在本地并验证：动漫数据来自 **AniList 实时公开 GraphQL 接口**（无需 Key）；  
> 电视剧 / 综艺 / 纪录片 来自 **TVmaze 公开 API**（无需 Key）；音乐来自 **Apple iTunes 公开接口**（无需 Key）——均为真实联网数据。  
> 仅 **电影 / 游戏** 因官方源需 Key，在未配置 `TMDB_API_KEY` / `RAWG_API_KEY`（均免费注册）时回退到明确标注 `MOCK` 的占位数据，配置即切换真实。**绝不为完成 UI 而伪造内容数据或资源链接。**

---

## 一、技术栈

| 层   | 选型                                              | 说明                         |
| --- | ----------------------------------------------- | -------------------------- |
| 前端  | Next.js 14 (App Router) + React 18 + TypeScript | SSR/SSG 兼顾 SEO 与个性化        |
| 样式  | Tailwind CSS                                    | 深色模式、响应式、手机优先              |
| 后端  | Next.js API Routes (Route Handlers)             | 前端不直接调第三方 API              |
| 数据库 | PostgreSQL（生产） / SQLite（本地开发，零配置）               | Prisma ORM                 |
| 缓存  | 服务端内存 TTL 缓存（生产可换 Redis）                        | 热门 45min / 搜索 8min / 详情 6h |

---

## 二、目录结构

```
recommender/
├─ prisma/schema.prisma        # 数据模型（User / Content / 行为 / 推荐历史 / 外部资源）
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx            # 根布局 + 导航 + 底部导航 + Toast
│  │  ├─ page.tsx              # 首页（Hero / 为你推荐 / 今日热榜 / 各类型热门 / 猜你喜欢）
│  │  ├─ movie|tv|anime|variety|documentary|music/   # 各娱乐类型页
│  │  ├─ games/mobile|online|single/                # 游戏三类页
│  │  ├─ watched|played|preferences|search|login|register/
│  │  ├─ detail/[type]/[id]/   # 统一详情页（SSR + JSON-LD）
│  │  ├─ api/                  # 内部 API（见第四节）
│  │  ├─ sitemap.ts|robots.ts  # SEO
│  ├─ components/              # Nav / ContentCard / ContentRow / DetailActions / HistoryList / 等
│  └─ lib/
│     ├─ adapters/             # 数据源适配器（anilist / tmdb / rawg / mock）+ 统一入口 index
│     ├─ recommendation.ts     # 推荐引擎（独立模块）
│     ├─ preferences.ts        # 兴趣画像动态更新
│     ├─ external.ts           # 外部资源链接生成（严格按类型规则）
│     ├─ auth.ts|prisma.ts|cache.ts|genreMap.ts|types.ts|categories.ts
├─ .env.example                # 环境变量模板
└─ README.md
```

---

## 三、数据库 Schema（要点）

统一 `Content` 模型承载全部 9 种类型（`contentType` 区分），避免重复建表；专属字段（artist/album/developer/publisher/platforms）按需使用。  
行为表：`WatchHistory`（已看）、`GamePlayHistory`（已玩）、`Like`、`Dislike`、`RecommendationHistory`（推荐历史，用于去重/优化/统计）、`SearchHistory`。  
画像：`UserPreference`（kind=genre|tag, key, weight，-10~+10）。  
外部资源：`ExternalResource`（resourceType 含 bilibili/cloud_drive/anime_resource/qq_music/official/steam/...，isVerified 标记是否确认真实链接）。

> 本地开发用 SQLite（`provider="sqlite"`）。切 PostgreSQL：改 `schema.prisma` 的 `provider="postgresql"` 并将 `DATABASE_URL` 改为 PG 连接串，重新 `prisma generate && prisma db push`。

---

## 四、API 文档

所有请求/响应均为 JSON。前端一律通过内部 API 取数，由 Service Layer + 外部适配器统一转换为内部 `Content` 模型。

| 方法       | 路径                                                        | 说明                                                                                |        |                     |                  |
| -------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ | ------------------- | ---------------- |
| GET      | `/api/content?type=&category=&page=`                      | 浏览分类列表（热门/高评分/新番…）。电视剧/综艺/纪录片/音乐/动漫走免 Key 真实源；电影/游戏在无 Key 时返回 MOCK（带 `isMock` 标记） |        |                     |                  |
| GET      | `/api/recommend?type=&source=&page=&count=`               | 个性化推荐 + 换一批。`type=all` 跨类型混合；按 `source` 去重                                        |        |                     |                  |
| GET      | `/api/search?q=&type=`                                    | 全局搜索（标题/原标题/人物/开发商/类型/标签）                                                         |        |                     |                  |
| GET      | `/api/detail?type=&id=`                                   | 详情 + 外部资源链接 + 今日热榜入口                                                              |        |                     |                  |
| POST     | `/api/behavior`                                           | \`{contentType, contentId, action: watched                                        | played | like                | dislike}\`，均支持切换 |
| GET      | \`/api/behavior?list=watched                              | played                                                                            | likes  | dislikes[\&type=]\` | 获取用户行为列表         |
| POST     | `/api/auth/register` `/api/auth/login` `/api/auth/logout` | 账号                                                                                |        |                     |                  |
| GET/POST | `/api/user`                                               | GET 当前用户+画像+计数；POST `{action:"init", genres, gameGenres, types, countries}` 初始化兴趣 |        |                     |                  |

---

## 五、数据源列表（真实 / 占位）

| 类型       | 数据源                                         | 能力                                                                 | 当前状态                                       |
| -------- | ------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| 动漫       | **AniList** GraphQL（无需 Key）                 | 热门/高评分/新番/完结/日本·国产·欧美，搜索，详情                                        | ✅ 已接入真实数据                                  |
| 电视剧      | **TVmaze** 公开 API（无需 Key）                   | 热门/高评分/最新/动作·冒险·喜剧·剧情·悬疑，搜索，详情（含演职人员）                              | ✅ 已接入真实数据                                  |
| 综艺       | **TVmaze** 公开 API（无需 Key）                   | 热门/最新/高评分（按 `type=Reality/Talk Show/Game Show` 过滤，以欧美真人秀/脱口秀/竞技为主） | ✅ 已接入真实数据（注：以欧美为主，无中国/日韩综艺可靠免费源）           |
| 纪录片      | **TVmaze** 公开 API（无需 Key）                   | 热门/自然/历史/科学/体育/美食（按 `type=Documentary` + 题材 genre 过滤）              | ✅ 已接入真实数据（注：TVmaze 无更细人文/社会子类，统一展示纪录片题材合集） |
| 音乐       | **Apple iTunes / Apple Music** 公开接口（无需 Key） | 全球热歌(us)/华语(hk)/日韩(jp) 真实榜单 + 搜索 + 详情（含封面/艺人/专辑）                   | ✅ 已接入真实数据（歌曲无评分/热度，字段留空；仅提供 QQ音乐入口）        |
| 电影       | **TMDB** v3 API（需 Key）                      | popular/top_rated/upcoming/类型/搜索/详情                                | 配置 `TMDB_API_KEY` 后自动启用（免费注册）              |
| 手游/网游/单机 | **RAWG** API（需 Key）                         | 热门/新/高评分/类型/搜索/详情/平台                                               | 配置 `RAWG_API_KEY` 后自动启用（免费注册）              |

> 电视剧 / 综艺 / 纪录片 / 音乐 现均已接入**免 Key 的真实公开源**，不再出现 MOCK 角标。  
> 仅 **电影** 与 **游戏** 因官方源需 Key，在未配置 `TMDB_API_KEY` / `RAWG_API_KEY` 时回退到明确标注 `MOCK` 的占位数据；配置 Key 后无需改代码即切换真实。绝不伪造内容或资源链接。

---

## 六、第三方 API 配置

复制 `.env.example` 为 `.env`，填入：

- `TMDB_API_KEY`：<https://www.themoviedb.org/documentation/api> 注册获取（v3 key）
- `RAWG_API_KEY`：<https://rawg.io/apidocs> 注册获取
- `ANILIST_ENABLED=true`（默认，无需 Key）
- `DATABASE_URL`：本地 `file:./dev.db`；生产改为 PostgreSQL 串

配置后**无需改动任何代码**，适配器自动从 MOCK 切换为真实数据。

---

## 七、环境变量

见 `.env.example`：`DATABASE_URL`、`TMDB_API_KEY`、`RAWG_API_KEY`、`ANILIST_ENABLED`。  
API Key 仅存于服务端（`.env`），**绝不暴露给前端**。

---

## 八、推荐系统说明

代码集中在 `src/lib/recommendation.ts`（独立模块，公式不散落前端）。  
混合打分（第一阶段）：

```
score = genre_match*0.25 + tag_match*0.20 + user_behavior*0.20
      + rating*0.10 + popularity*0.10 + recency*0.10 + diversity*0.05
```

- **内容特征**：类型、标签、年份、国家、语言、评分、热度。
- **用户行为**：已看/已玩/喜欢/不喜欢/点击，经 `preferences.ts` 动态更新画像权重（喜欢 +3，已看 +1，不喜欢 -3，且不永久屏蔽整类）。
- **推荐理由（recommendReasons）**：引擎对每条结果输出「为什么推荐」标签（如「你偏爱『动作』」「兴趣契合『悬疑』」「高口碑 9.0」「人气热门」「新近作品」「拓展新类型」「热门精选」），在卡片上以蓝色角标展示，帮助用户理解推荐逻辑（仅推荐场景填充，浏览页不显示）。
- **首页混合推荐跨类型轮转**：`type=all` 时按内容类型分组后轮转取前 N，避免结果被单一类型刷屏，保证首页「为你推荐」的类型多样性。
- **冷启动**：无画像时提高评分/热度/新鲜度权重，并以「首次兴趣选择」引导初始化。
- 跨数据源的类型/标签已通过 `genreMap.ts` 统一为中文规范词，保证 `genre_match` 一致。
- 推荐系统与外部资源**完全解耦**：是否有 Bilibili/网盘/Steam 链接不影响推荐分。

---

## 九、换一批实现

`/api/recommend` 用 `page` 翻页获取**新候选集**（跨热门/高评分/新多个分类去重合并），  
并对本 `source` 近期展示过的内容（写入 `RecommendationHistory`）做**去重**，防止短时间重复。  
前端 `ContentRow` 的「换一批」按钮 `page+1` 重新拉取，记录历史、按兴趣重算。

---

## 十、已看 / 十一、已玩

- 娱乐内容（电影/电视剧/动漫/综艺/纪录片/音乐）记录到 `WatchHistory`；游戏记录到 `GamePlayHistory`。
- 卡片与详情页按钮切换（再点一次取消），同时回写兴趣画像。
- 「已看 / 已玩」页支持：全部分类筛选、关键词搜索、移除记录（点按钮取消即移除）。

---

## 十二、外部资源系统

`src/lib/external.ts` 按内容类型生成**允许的**入口，严格执行需求文档第三十四条，  
**一律只提供首页入口或搜索入口，绝不伪造具体作品 URL / 视频 ID**：

| 类型            | Bilibili | 网盘   | 动漫资源 | QQ音乐                           |
| ------------- | -------- | ---- | ---- | ------------------------------ |
| 电影/电视剧/综艺/纪录片 | ✅ 搜索     | ✅ 入口 | ❌    | ❌                              |
| 动漫            | ✅ 搜索     | ✅ 入口 | ✅ 入口 | ❌                              |
| 音乐            | ❌        | ❌    | ❌    | ✅ 搜索                           |
| 游戏            | ❌        | ❌    | ❌    | 仅真实数据有官网/Steam 时才加（isVerified） |

---

## 十三、Bilibili 处理

电影/电视剧/动漫/综艺/纪录片支持。能确认具体视频才显示具体链接；否则一律用**搜索入口**  
`https://search.bilibili.com/all?keyword=<URL编码标题>`，不伪造视频 ID。

## 十四、网盘处理

目标 `https://yx.zerovv.top/`。未验证具体资源 URL，只作为**入口** `https://yx.zerovv.top/`，  
并提供「复制名称」供用户自行搜索；不猜测网盘 URL，不把不存在资源标为真实。

## 十五、动漫资源处理

目标 `https://m.ezdmw.org/`。未确认搜索规则，只作**入口**；确认规则后才自动进搜索结果，不猜 URL。

## 十六、QQ音乐处理

仅音乐页。不伪造具体歌曲 URL；用**搜索入口** `https://y.qq.com/n/ryqq/search?w=<编码>`；有具体页才直链。

## 十七、今日热榜处理

首页与详情页均放置 `https://tophub.today/` 入口按钮。未确认合法数据 API，**不声称已抓取 TopHub 数据**，仅作外部入口。

---

## 十八、搜索系统

`/api/search` 跨 9 类检索标题/原标题/人物/艺术家/开发商/类型/标签；无 Key 的类型走 MOCK 检索。  
结果按类型分组展示。搜索词写入 `SearchHistory`。

---

## 十九、SEO

- `layout.tsx` 动态 Metadata + Open Graph；`app/sitemap.ts`、`app/robots.ts`。
- 详情页 `generateMetadata` 按内容生成标题/描述/OG 图，并注入 `schema.org` JSON-LD（CreativeWork / MusicRecording / VideoGame）。
- 详情页为 SSR（`/detail/[type]/[id]`），URL 语义化，非 `?id=`。

---

## 二十、安全

- API Key 仅服务端；会话用 HttpOnly+SameSite=Lax Cookie（HTTPS 下自动加 Secure）。
- 外部 URL：仅使用可验证的搜索/首页入口，不信任任意用户输入的 URL。
- 密码 scrypt 加盐哈希；注册/登录参数校验。
- 面向用户的错误以 JSON 返回，前端 Toast 提示，避免白屏/undefined。

---

## 二十一、本地开发

```bash
cd recommender
npm install                 # 安装依赖
cp .env.example .env        # 默认 SQLite，开箱即跑
npx prisma db push          # 建库（首次）
npm run dev                 # http://localhost:3000
```

> 若 `npm run build` 时 `prisma generate` 报 EPERM（多为上一次服务仍占用引擎文件），  
> 先停止运行中的服务再构建即可。

---

## 二十二、部署（Vercel / Cloudflare）

1. 仓库推到 Git 平台，导入 Vercel（Next.js 自动识别，无需 `vercel.json`）。
2. 环境变量后台填入：`DATABASE_URL`（PostgreSQL，如 Neon/Supabase）、`TMDB_API_KEY`、`RAWG_API_KEY`、`ANILIST_ENABLED=true`。
3. 构建命令：`prisma generate && next build`（package.json 已配置）；Postgres 下 `prisma migrate deploy` 建表。
4. 部署后用户通过公网访问，无需本机常驻服务器。

---

## 二十三、已知限制（诚实声明）

- **电影、游戏** 在缺 Key 时为 MOCK 占位；配置 `TMDB_API_KEY` / `RAWG_API_KEY`（均免费注册）即真实。
- **电视剧 / 综艺 / 纪录片 / 音乐** 已接入免 Key 真实公开源（TVmaze / iTunes），实测返回真实数据。
- **综艺** 来自 TVmaze 的 `Reality / Talk Show / Game Show` 类型，**以欧美真人秀/脱口秀/竞技节目为主**；暂无中国/日韩综艺的可靠免费源，故不声称覆盖国内综艺。
- **纪录片** 按 TVmaze `type=Documentary` + 题材 genre（Nature/History/Science-Fiction/Sports/Food）过滤；TVmaze 无更细「人文/社会」子类，这几类统一展示纪录片题材合集。个别细分题材（科学/体育/美食）因 TVmaze 标注密度，单次窗口返回条目较少（约 5 条），「换一批」翻页可能为空——属真实数据稀疏，非 bug。
- **音乐** 来自 iTunes 真实榜单/搜索，歌曲本身无评分/热度字段，故音乐卡片不显示伪造评分；QQ音乐入口仍为搜索入口（不伪造具体歌曲 URL）。
- `ExternalResource` 表已建好，用于存放**未来真实数据源提供的可验证链接**；当前外链由规则实时生成（均为入口/搜索，无伪造）。
- 缓存用内存实现，多实例部署需换 Redis（已在架构中预留）。
- 推荐为「内容特征+行为+热度+新鲜度」混合模型，尚未引入协同过滤/Embedding/LLM。

---

## 二十四、后续升级路线

- 协同过滤（user-item）→ 向量化（Embedding + 向量库）→ LLM 重排。
- 电影接入 TMDB（填 Key 即真）；游戏接入 RAWG（填 Key 即真）；如有合规授权源可进一步覆盖综艺/音乐的地区细分。
- 推荐历史可视化、A/B 实验、实时反馈学习。
- Redis 缓存、读写分离、CDN 图片。
- 社交：关注、共同喜好、分享。
