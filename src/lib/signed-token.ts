import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short signed tokens for links in emails (D231): base64url JSON payload,
 * a purpose and an expiry, HMAC-SHA256 with the server secret. The purpose
 * is part of the signature, so a token made for one link opens no other.
 */

const toBase64Url = (value: Buffer) => value.toString("base64url");

function sign(purpose: string, payload: string, secret: string): string {
  return toBase64Url(
    createHmac("sha256", secret).update(`${purpose}.${payload}`).digest(),
  );
}

export function signToken<T extends object>(
  purpose: string,
  claims: T,
  expiresAt: Date,
  secret: string,
): string {
  const payload = toBase64Url(
    Buffer.from(
      JSON.stringify({ ...claims, exp: expiresAt.toISOString() }),
      "utf8",
    ),
  );
  return `${payload}.${sign(purpose, payload, secret)}`;
}

/** The claims, or null for a forged, foreign-purpose or expired token. */
export function verifyToken<T extends object>(
  purpose: string,
  token: string,
  secret: string,
  now: Date,
): T | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || !secret) return null;
  const expected = Buffer.from(sign(purpose, payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as T & { exp?: string };
    if (!claims.exp || Date.parse(claims.exp) <= now.getTime()) return null;
    return claims;
  } catch {
    return null;
  }
}
