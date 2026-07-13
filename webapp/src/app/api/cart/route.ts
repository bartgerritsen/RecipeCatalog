import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getValidMemberToken, NotConnectedError, ConnectionRevokedError } from "@/lib/ah/tokens";
import { ahGetBasket } from "@/lib/ah/basket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const token = await getValidMemberToken(userId);
    const basket = await ahGetBasket(token);
    return NextResponse.json({ basket });
  } catch (e) {
    if (e instanceof NotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 409 });
    }
    if (e instanceof ConnectionRevokedError) {
      return NextResponse.json({ error: "revoked" }, { status: 409 });
    }
    console.error("cart fetch error", e);
    return NextResponse.json({ error: "cart_failed" }, { status: 500 });
  }
}
