import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import {
  getValidMemberToken,
  NotConnectedError,
  ConnectionRevokedError,
} from "@/lib/ah/tokens";
import { ahAddToBasket, ahDeleteFromBasket, ahUpdateBasket } from "@/lib/ah/basket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { action, ... } — modify a single basket item.
 *   { action: "remove", productId }
 *   { action: "setQuantity", productId, quantity }
 *   { action: "replace", oldProductId, newProductId, quantity? }
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    const token = await getValidMemberToken(userId);
    let res: { status: string; errorMessage: string | null };

    if (action === "remove") {
      res = await ahDeleteFromBasket(token, [Number(body.productId)]);
    } else if (action === "setQuantity") {
      const qty = Math.max(0, Math.round(Number(body.quantity) || 0));
      res =
        qty === 0
          ? await ahDeleteFromBasket(token, [Number(body.productId)])
          : await ahUpdateBasket(token, [{ id: Number(body.productId), quantity: qty }]);
    } else if (action === "replace") {
      const qty = Math.max(1, Math.round(Number(body.quantity) || 1));
      await ahDeleteFromBasket(token, [Number(body.oldProductId)]);
      res = await ahAddToBasket(token, [{ id: Number(body.newProductId), quantity: qty }]);
    } else {
      return NextResponse.json({ error: "bad_action" }, { status: 400 });
    }

    return NextResponse.json({ status: res.status, errorMessage: res.errorMessage });
  } catch (e) {
    if (e instanceof NotConnectedError)
      return NextResponse.json({ error: "not_connected" }, { status: 409 });
    if (e instanceof ConnectionRevokedError)
      return NextResponse.json({ error: "revoked" }, { status: 409 });
    console.error("cart item error", e);
    return NextResponse.json({ error: "modify_failed" }, { status: 500 });
  }
}
