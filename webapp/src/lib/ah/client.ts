/**
 * Low-level Albert Heijn mobile-API client. Server-only.
 * Ported from the verified albert_heijn_api.ipynb.
 */
export const AH_API_BASE = "https://api.ah.nl";
export const AH_GRAPHQL_URL = `${AH_API_BASE}/graphql`;
export const AH_AUTH_BASE = `${AH_API_BASE}/mobile-auth/v1/auth`;
export const AH_LOGIN_URL =
  "https://login.ah.nl/secure/oauth/authorize" +
  "?client_id=appie&redirect_uri=appie://login-exit&response_type=code";

const BASE_HEADERS = {
  "User-Agent": "Appie/8.22.3",
  "Content-Type": "application/json",
  "X-Application": "AHWEBSHOP",
};

export interface AhTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function fetchAnonymousToken(): Promise<AhTokens> {
  const res = await fetch(`${AH_AUTH_BASE}/token/anonymous`, {
    method: "POST",
    headers: BASE_HEADERS,
    body: JSON.stringify({ clientId: "appie" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AH anon token failed: ${res.status}`);
  return res.json();
}

export async function exchangeCode(code: string): Promise<AhTokens> {
  const res = await fetch(`${AH_AUTH_BASE}/token`, {
    method: "POST",
    headers: BASE_HEADERS,
    body: JSON.stringify({ clientId: "appie", code: code.trim() }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AH code exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshToken(refresh_token: string): Promise<AhTokens> {
  const res = await fetch(`${AH_AUTH_BASE}/token/refresh`, {
    method: "POST",
    headers: BASE_HEADERS,
    body: JSON.stringify({ clientId: "appie", refreshToken: refresh_token }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AH token refresh failed: ${res.status}`);
  return res.json();
}

/** GraphQL POST with a given bearer token. */
export async function ahGraphQL<T = unknown>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(AH_GRAPHQL_URL, {
    method: "POST",
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AH GraphQL HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) throw new Error(`AH GraphQL error: ${JSON.stringify(json.errors).slice(0, 500)}`);
  return json.data as T;
}

/** REST GET with a given bearer token. */
export async function ahRest<T = unknown>(
  token: string,
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${AH_API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AH REST ${path} -> ${res.status}`);
  return res.json();
}
