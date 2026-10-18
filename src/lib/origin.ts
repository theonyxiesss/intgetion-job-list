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
const SECRET_AUTHENTICATED = new Set([
  "/api/telegram/webhook",
  // Supabase Auth Send Email Hook (D325): no Origin; signature is the gate.
  "/api/auth/hooks/send-email",
]);

/**
 * The MCP endpoint (D486). Outside assistants call it from their servers
 * with no Origin, so the site-origin rule would refuse every call. The route
 * checks Origin and Host itself: no Origin passes, a browser Origin must be
 * this site (DNS rebinding). It reads no session cookie and writes nothing.
 */
export const MCP_PATH = "/api/mcp";

export function needsOriginCheck(pathname: string): boolean {
  return !SECRET_AUTHENTICATED.has(pathname) && pathname !== MCP_PATH;
}
