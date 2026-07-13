import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for AH tokens at rest.
 * Output format: base64( iv[12] | authTag[16] | ciphertext ).
 * Key: 32 bytes as 64 hex chars in AH_TOKEN_ENC_KEY.
 */
function getKey(): Buffer {
  const hex = process.env.AH_TOKEN_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("AH_TOKEN_ENC_KEY must be 64 hex chars (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decrypt(enc: string): string {
  const raw = Buffer.from(enc, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** HMAC-signed, base64url state token: `payloadB64.sigB64`. */
export function signState(payload: object, ttlSeconds = 600): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const b64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.APP_SECRET!)
    .update(b64)
    .digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyState<T = Record<string, unknown>>(token: string): T | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto
    .createHmac("sha256", process.env.APP_SECRET!)
    .update(b64)
    .digest("base64url");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  const body = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  if (typeof body.exp === "number" && body.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return body as T;
}
