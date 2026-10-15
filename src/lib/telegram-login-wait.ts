/** Browser hint that a bot sign-in is in progress. Not a secret. */
export const TG_WAIT_COOKIE = "tg_wait";

export type TelegramWaitPurpose = "signin" | "link";

/** Reads the hint cookie. The one-time code stays in the httpOnly cookie. */
export function telegramWaitPurpose(
  cookieHeader: string,
): TelegramWaitPurpose | null {
  for (const part of cookieHeader.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name !== TG_WAIT_COOKIE) continue;
    if (value === "signin" || value === "link") return value;
  }
  return null;
}
