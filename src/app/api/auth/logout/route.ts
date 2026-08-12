import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logout, clearSessionCookie } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  const token = cookies().get("sb_session")?.value;
  if (token) await logout(token);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
