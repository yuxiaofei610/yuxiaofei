import { NextResponse } from "next/server";
import { getHotBoards } from "@/lib/hot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const boards = await getHotBoards();
    return NextResponse.json({ boards });
  } catch {
    return NextResponse.json({ boards: [] }, { status: 200 });
  }
}
