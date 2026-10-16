/** `/start ugc_<token>` (27.8). The whole payload is at most 64 characters. */

const TOKEN = /^[A-Za-z0-9_-]+$/;

/** The token inside a valid `ugc_` payload, or null when this is not one. */
export function ugcTokenFromStart(payload: string): string | null {
  if (payload.length > 64 || !payload.startsWith("ugc_")) return null;
  const token = payload.slice("ugc_".length);
  if (!token || !TOKEN.test(token)) return null;
  return token;
}

/**
 * `ugc_` is handled before the login greeting. Any other `/start` payload
 * still belongs to that greeting (27.17).
 */
export function startPayloadRoute(payload: string): "ugc" | "login" {
  return ugcTokenFromStart(payload) ? "ugc" : "login";
}
