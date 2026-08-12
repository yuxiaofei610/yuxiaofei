import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "BAD_BODY" }, { status: 400 });
  const { email, username, password } = body as { email?: string; username?: string; password?: string };
  if (!email || !username || !password) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 });
  }
  const exist = await prisma.user.findUnique({ where: { email } });
  if (exist) return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });

  const user = await prisma.user.create({
    data: { email, username, passwordHash: hashPassword(password) },
  });
  const token = await createSession(user.id);
  setSessionCookie(token, req.nextUrl.protocol === "https:");
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, username: user.username } });
}
