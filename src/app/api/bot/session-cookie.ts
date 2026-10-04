import { siteUrl } from "@/lib/supabase/env";
import { BOT_SESSION_COOKIE } from "@/modules/bot/service";

/** Reads the bot session token from the request cookies. */
export function sessionToken(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === BOT_SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * HttpOnly session cookie for the bot API only, 30 days (D172). `Secure`
 * follows the site URL: a production build served over plain http (CI)
 * would otherwise never get the cookie back.
 */
export function sessionCookie(token: string): string {
  const secure = siteUrl().startsWith("https://") ? "; Secure" : "";
  return `${BOT_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api/bot; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`;
}
