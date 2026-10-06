const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF check (section 6): a mutating request must carry an Origin equal to
 * the site origin. Requests without Origin are refused too.
 */
export function isAllowedOrigin(
  method: string,
  origin: string | null,
  siteUrl: string,
): boolean {
  if (safeMethods.has(method.toUpperCase())) return true;
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

/**
 * Routes that prove who is calling with a shared secret instead of an Origin
 * (D313). Telegram's servers send the webhook with no Origin header at all, so
 * the CSRF rule would reject every update before the route can check the
 * secret. The route itself stays the gate: a wrong secret is still refused.
 */
const SECRET_AUTHENTICATED = new Set(["/api/telegram/webhook"]);

export function needsOriginCheck(pathname: string): boolean {
  return !SECRET_AUTHENTICATED.has(pathname);
}
