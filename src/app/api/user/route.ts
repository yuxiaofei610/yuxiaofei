import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/recommendation";
import { applyInitialSelection } from "@/lib/preferences";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  const profile = await getProfile(user.id);
  const [watched, played, likes, dislikes] = await Promise.all([
    prisma.watchHistory.count({ where: { userId: user.id } }),
    prisma.gamePlayHistory.count({ where: { userId: user.id } }),
    prisma.like.count({ where: { userId: user.id } }),
    prisma.dislike.count({ where: { userId: user.id } }),
  ]);

  // 画像按权重排序（取前若干用于展示）
  const genreProfile = Object.entries(profile.genres)
    .map(([key, weight]) => ({ key, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 30);

  return NextResponse.json({
    user: { id: user.id, email: user.email, username: user.username },
    counts: { watched, played, likes, dislikes },
    profile: { genres: genreProfile, hasData: profile.hasData },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "NOT_LOGIN" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || body.action !== "init") return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });

  await applyInitialSelection(user.id, {
    genres: body.genres || [],
    gameGenres: body.gameGenres || [],
    types: body.types || [],
    countries: body.countries || [],
  });
  return NextResponse.json({ ok: true });
}
