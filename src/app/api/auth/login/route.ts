import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  const token = await createSession(user.id);
  setSessionCookie(token, req.nextUrl.protocol === "https:");
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } });
}
