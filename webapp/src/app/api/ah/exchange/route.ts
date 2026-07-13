import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { verifyState } from "@/lib/crypto";
import { exchangeCode } from "@/lib/ah/client";
import { storeMemberTokens } from "@/lib/ah/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Extract the OAuth code from either a raw code or a full appie:// URL. */
function extractCode(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // Full URL form: appie://login-exit?code=XXX  (or any ...?code=XXX)
  const m = s.match(/[?&]code=([^&\s]+)/);
  if (m) return decodeURIComponent(m[1]);
  // Otherwise assume the pasted value is the code itself.
  return s;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = String(body.code ?? "");
  const state = String(body.state ?? "");

  // Verify the state binds to this user (defense in depth; the session already
  // identifies the user, but this prevents a code being submitted out of flow).
  const parsed = verifyState<{ uid: string }>(state);
  if (!parsed || parsed.uid !== userId) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  const code = extractCode(raw);
  if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });

  try {
    const tokens = await exchangeCode(code);
    await storeMemberTokens(userId, tokens);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("code exchange failed", e);
    return NextResponse.json({ error: "exchange_failed" }, { status: 400 });
  }
}
