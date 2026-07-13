import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { isConnected } from "@/lib/ah/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ connected: false }, { status: 401 });
  return NextResponse.json({ connected: await isConnected(userId) });
}
