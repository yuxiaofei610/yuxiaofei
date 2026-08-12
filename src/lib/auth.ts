import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "sb_session";
const SESSION_TTL_DAYS = 30;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const h = scryptSync(password, salt, 64);
  const hs = Buffer.from(hash, "hex");
  if (hs.length !== h.length) return false;
  return timingSafeEqual(h, hs);
}

export { hashPassword, verifyPassword };

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return token;
}

export function setSessionCookie(token: string, secure = false): void {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
    secure,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function logout(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {});
}
