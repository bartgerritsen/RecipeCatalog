import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import {
  getValidMemberToken,
  NotConnectedError,
  ConnectionRevokedError,
} from "@/lib/ah/tokens";
import { ahAddToBasket } from "@/lib/ah/basket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { items: [{ productId, quantity }] }
 * Adds exactly the products the user selected (from the recipe's shoppable
 * list) to the AH basket. No server-side guessing — the client sends the
 * chosen products (AH's own suggestions or user-picked alternatives).
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rawItems = Array.isArray(body.items) ? body.items : [];
  // Aggregate duplicate products, keep integer quantities >= 1.
  const byProduct = new Map<number, number>();
  for (const it of rawItems) {
    const id = Number(it.productId);
    const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
    if (Number.isFinite(id) && id > 0) byProduct.set(id, (byProduct.get(id) ?? 0) + qty);
  }
  const items = [...byProduct.entries()].map(([id, quantity]) => ({ id, quantity }));
  if (items.length === 0) {
    return NextResponse.json({ error: "no_items" }, { status: 400 });
  }

  try {
    const token = await getValidMemberToken(userId);
    const res = await ahAddToBasket(token, items);
    return NextResponse.json({
      status: res.status,
      errorMessage: res.errorMessage,
      addedProducts: items.length,
    });
  } catch (e) {
    if (e instanceof NotConnectedError)
      return NextResponse.json({ error: "not_connected" }, { status: 409 });
    if (e instanceof ConnectionRevokedError)
      return NextResponse.json({ error: "revoked" }, { status: 409 });
    console.error("add-recipe error", e);
    return NextResponse.json({ error: "add_failed" }, { status: 500 });
  }
}
