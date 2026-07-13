import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { signState } from "@/lib/crypto";
import { AH_LOGIN_URL } from "@/lib/ah/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the real Albert Heijn login URL (redirect_uri = appie://login-exit)
 * plus a signed `state` token that binds the pending connection to this user.
 *
 * Note: AH strictly validates redirect_uri (a custom callback returns HTTP 400),
 * so we cannot receive the code directly. The client opens this URL; after login
 * AH redirects to appie://login-exit?code=... — the user copies that code/URL
 * back into the app, which posts it to /api/ah/exchange with this `state`.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const state = signState({ uid: userId }, 900); // 15 min
  return NextResponse.json({ loginUrl: AH_LOGIN_URL, state });
}
