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

/** HttpOnly session cookie for the bot API only, 30 days (D172). */
export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${BOT_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api/bot; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`;
}
