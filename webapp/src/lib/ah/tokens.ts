import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  AhTokens,
  fetchAnonymousToken,
  refreshToken as refreshAhToken,
} from "./client";

const SKEW_MS = 60_000; // refresh 1 min before expiry

/**
 * Shared anonymous AH token, cached in a single DB row so we mint it rarely.
 * Safe against light concurrency: worst case two requests refresh at once.
 */
export async function getAnonToken(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ah_service_token")
    .select("access_token, expires_at")
    .eq("id", 1)
    .maybeSingle();

  const valid =
    data?.access_token &&
    data.expires_at &&
    new Date(data.expires_at).getTime() - SKEW_MS > Date.now();

  if (valid) return data!.access_token as string;

  const tokens = await fetchAnonymousToken();
  await admin
    .from("ah_service_token")
    .update({
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      refreshed_at: new Date().toISOString(),
    })
    .eq("id", 1);
  return tokens.access_token;
}

export async function storeMemberTokens(userId: string, tokens: AhTokens) {
  const admin = createAdminClient();
  await admin.from("ah_connections").upsert({
    user_id: userId,
    access_token_enc: encrypt(tokens.access_token),
    refresh_token_enc: encrypt(tokens.refresh_token),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    status: "active",
    updated_at: new Date().toISOString(),
  });
}

export class NotConnectedError extends Error {}
export class ConnectionRevokedError extends Error {}

/**
 * Valid member access token for a user, refreshing (and persisting the rotated
 * refresh token) when near expiry. Throws if not connected / revoked.
 */
export async function getValidMemberToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ah_connections")
    .select("access_token_enc, refresh_token_enc, expires_at, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) throw new NotConnectedError("Albert Heijn account not connected");
  if (data.status !== "active") throw new ConnectionRevokedError("AH connection revoked");

  const expMs = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (expMs - SKEW_MS > Date.now()) {
    return decrypt(data.access_token_enc as string);
  }

  // Refresh — AH rotates the refresh token, so persist both.
  try {
    const refreshed = await refreshAhToken(decrypt(data.refresh_token_enc as string));
    await storeMemberTokens(userId, refreshed);
    return refreshed.access_token;
  } catch (e) {
    await admin.from("ah_connections").update({ status: "revoked" }).eq("user_id", userId);
    throw new ConnectionRevokedError("AH token refresh failed; reconnect required");
  }
}

export async function isConnected(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ah_connections")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.status === "active";
}
