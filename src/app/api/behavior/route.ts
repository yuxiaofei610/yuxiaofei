import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDetail } from "@/lib/adapters";
import { adjustFromBehavior, BehaviorAction } from "@/lib/preferences";
import { CONTENT_TYPES, ContentType } from "@/lib/types";

// 行为记录：已看 / 已玩 / 喜欢 / 不喜欢（均支持切换）
// POST { contentType, contentId, action: watched|played|like|dislike }
// GET  ?list=watched|played|likes|dislikes[&type=xxx]  返回内容详情列表

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "NOT_LOGIN" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });
  const { contentType, contentId, action } = body as { contentType: ContentType; contentId: string; action: BehaviorAction };
  if (!CONTENT_TYPES.includes(contentType) || !contentId || !action) {
    return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
  }

  const content = await getDetail(contentType, contentId);
  if (!content) return NextResponse.json({ error: "CONTENT_NOT_FOUND" }, { status: 404 });

  const isGame = contentType === "mobile_game" || contentType === "online_game" || contentType === "single_player_game";

  // 互斥处理：喜欢 / 不喜欢 互删
  if (action === "like") {
    await prisma.dislike.deleteMany({ where: { userId: user.id, contentId } }).catch(() => {});
  }
  if (action === "dislike") {
    await prisma.like.deleteMany({ where: { userId: user.id, contentId } }).catch(() => {});
  }

  let added = false;
  if (action === "watched") {
    const exist = await prisma.watchHistory.findFirst({ where: { userId: user.id, contentId } });
    if (exist) { await prisma.watchHistory.delete({ where: { id: exist.id } }); await adjustFromBehavior(user.id, content, "watched"); }
    else { await prisma.watchHistory.create({ data: { userId: user.id, contentId, contentType } }); added = true; }
  } else if (action === "played") {
    const exist = await prisma.gamePlayHistory.findFirst({ where: { userId: user.id, contentId } });
    if (exist) { await prisma.gamePlayHistory.delete({ where: { id: exist.id } }); await adjustFromBehavior(user.id, content, "watched"); }
    else { await prisma.gamePlayHistory.create({ data: { userId: user.id, contentId, contentType } }); added = true; }
  } else if (action === "like") {
    const exist = await prisma.like.findFirst({ where: { userId: user.id, contentId } });
    if (exist) { await prisma.like.delete({ where: { id: exist.id } }); await adjustFromBehavior(user.id, content, "like"); }
    else { await prisma.like.create({ data: { userId: user.id, contentId, contentType } }); added = true; }
  } else if (action === "dislike") {
    const exist = await prisma.dislike.findFirst({ where: { userId: user.id, contentId } });
    if (exist) { await prisma.dislike.delete({ where: { id: exist.id } }); await adjustFromBehavior(user.id, content, "dislike"); }
    else { await prisma.dislike.create({ data: { userId: user.id, contentId, contentType } }); added = true; }
  }

  // 新行为才加正向/负向权重；取消则已在上分支回退
  if (added && (action === "like" || action === "dislike")) {
    await adjustFromBehavior(user.id, content, action);
  }

  return NextResponse.json({ ok: true, added, action });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "NOT_LOGIN" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const list = sp.get("list");
  const typeFilter = sp.get("type");

  let ids: { contentId: string; contentType: string }[] = [];
  if (list === "watched") {
    const rows = await prisma.watchHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    ids = rows.map((r: { contentId: string; contentType: string }) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else if (list === "played") {
    const rows = await prisma.gamePlayHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    ids = rows.map((r: { contentId: string; contentType: string }) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else if (list === "likes") {
    const rows = await prisma.like.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    ids = rows.map((r: { contentId: string; contentType: string }) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else if (list === "dislikes") {
    const rows = await prisma.dislike.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    ids = rows.map((r: { contentId: string; contentType: string }) => ({ contentId: r.contentId, contentType: r.contentType }));
  } else {
    return NextResponse.json({ error: "INVALID_LIST" }, { status: 400 });
  }

  if (typeFilter) ids = ids.filter((x) => x.contentType === typeFilter);

  const items = [];
  for (const x of ids) {
    const c = await getDetail(x.contentType as ContentType, x.contentId);
    if (c) items.push(c);
  }
  return NextResponse.json({ items });
}
