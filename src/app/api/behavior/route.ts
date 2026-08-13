import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDetail } from "@/lib/adapters";
import { adjustFromBehavior } from "@/lib/preferences";
import { CONTENT_TYPES, ContentType } from "@/lib/types";

// 行为记录：已看 / 已玩 / 喜欢 / 不喜欢 / 收藏 / 想看 / 评分（均支持切换）
// POST { contentType, contentId, action: watched|played|like|dislike|favorite|want_watch|rating[, rating] }
// GET  ?list=watched|played|likes|favorites|dislikes|want_watch|ratings[&type=xxx]  返回内容详情列表

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "NOT_LOGIN" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });
  const { contentType, contentId, action, rating } = body as {
    contentType: ContentType;
    contentId: string;
    action: string;
    rating?: number;
  };
  if (!CONTENT_TYPES.includes(contentType) || !contentId || !action) {
    return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
  }

  const content = await getDetail(contentType, contentId);
  if (!content) return NextResponse.json({ error: "CONTENT_NOT_FOUND" }, { status: 404 });

  const isGame = contentType.includes("game");
  let added = false;
  let value: number | undefined;

  // 喜欢 / 不喜欢 互斥
  if (action === "like") await prisma.dislike.deleteMany({ where: { userId: user.id, contentId } }).catch(() => {});
  if (action === "dislike") await prisma.like.deleteMany({ where: { userId: user.id, contentId } }).catch(() => {});

  if (action === "watched" || action === "played") {
    const model = isGame ? prisma.gamePlayHistory : prisma.watchHistory;
    const exist = await model.findFirst({ where: { userId: user.id, contentId } });
    if (exist) {
      await model.delete({ where: { id: exist.id } });
      await adjustFromBehavior(user.id, content, "watched");
    } else {
      await model.create({ data: { userId: user.id, contentId, contentType } });
      added = true;
    }
  } else if (action === "like") {
    const exist = await prisma.like.findFirst({ where: { userId: user.id, contentId } });
    if (exist) {
      await prisma.like.delete({ where: { id: exist.id } });
      await adjustFromBehavior(user.id, content, "like");
    } else {
      await prisma.like.create({ data: { userId: user.id, contentId, contentType } });
      added = true;
      await adjustFromBehavior(user.id, content, "like");
    }
  } else if (action === "dislike") {
    const exist = await prisma.dislike.findFirst({ where: { userId: user.id, contentId } });
    if (exist) {
      await prisma.dislike.delete({ where: { id: exist.id } });
      await adjustFromBehavior(user.id, content, "dislike");
    } else {
      await prisma.dislike.create({ data: { userId: user.id, contentId, contentType } });
      added = true;
      await adjustFromBehavior(user.id, content, "dislike");
    }
  } else if (action === "favorite") {
    const exist = await prisma.like.findFirst({ where: { userId: user.id, contentId } });
    if (exist) await prisma.like.delete({ where: { id: exist.id } });
    else {
      await prisma.like.create({ data: { userId: user.id, contentId, contentType } });
      added = true;
    }
  } else if (action === "want_watch") {
    const exist = await prisma.wantWatch.findFirst({ where: { userId: user.id, contentId } });
    if (exist) await prisma.wantWatch.delete({ where: { id: exist.id } });
    else {
      await prisma.wantWatch.create({ data: { userId: user.id, contentId, contentType } });
      added = true;
    }
  } else if (action === "rating") {
    const r = Number(rating);
    if (!r || r < 1 || r > 5) return NextResponse.json({ error: "INVALID_RATING" }, { status: 400 });
    await prisma.userRating.upsert({
      where: { userId_contentId: { userId: user.id, contentId } },
      update: { rating: r },
      create: { userId: user.id, contentId, contentType, rating: r },
    });
    added = true;
    value = r;
  } else {
    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, added, action, rating: value });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "NOT_LOGIN" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const list = sp.get("list");
  const typeFilter = sp.get("type");

  let rows: { contentId: string; contentType: string; rating?: number }[] = [];
  if (list === "watched") {
    rows = (await prisma.watchHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })).map((r) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else if (list === "played") {
    rows = (await prisma.gamePlayHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })).map((r) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else if (list === "likes" || list === "favorites") {
    rows = (await prisma.like.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })).map((r) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else if (list === "dislikes") {
    rows = (await prisma.dislike.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })).map((r) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else if (list === "want_watch") {
    rows = (await prisma.wantWatch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })).map((r) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else if (list === "ratings") {
    rows = (await prisma.userRating.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })).map((r) => ({ contentId: r.contentId, contentType: r.contentType, rating: r.rating }));
  } else {
    return NextResponse.json({ error: "INVALID_LIST" }, { status: 400 });
  }

  if (typeFilter) rows = rows.filter((x) => x.contentType === typeFilter);

  const items: any[] = [];
  for (const x of rows) {
    const c = await getDetail(x.contentType as ContentType, x.contentId);
    if (c) {
      if (x.rating != null) (c as any).userRating = x.rating;
      items.push(c);
    }
  }
  return NextResponse.json({ items });
}
