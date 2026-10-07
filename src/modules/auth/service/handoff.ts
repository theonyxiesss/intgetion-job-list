import {
  getAuthUserLoginEmail,
  magicLinkTokenHash,
} from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { HttpError } from "@/lib/http";
import type { AppLocale } from "@/i18n/routing";
import type { CurrentUser } from "./auth-service";
import { localePrefix } from "@/i18n/paths";

/**
 * A one-time address that opens this person's session in another browser
 * (D316). The Mini App lives inside Telegram's frame, and its session cannot
 * follow the person into Chrome or an installed app — so instead of asking
 * them to sign in again, the Mini App hands over a link that does it.
 *
 * The link is the ordinary magic-link callback: single use, expires on
 * Supabase's own schedule, and worth exactly one session. It is minted only
 * for the signed-in person asking for their own, never for anyone else.
 */
export async function createSessionHandoff(
  user: CurrentUser,
  locale: AppLocale,
): Promise<{ url: string }> {
  const email = await getAuthUserLoginEmail(user.authUid);
  if (!email) {
    throw new HttpError(503, "AUTH_UNAVAILABLE", "Cannot open a session link");
  }
  const tokenHash = await magicLinkTokenHash(email);
  if (!tokenHash) {
    throw new HttpError(503, "AUTH_UNAVAILABLE", "Cannot open a session link");
  }
  const url = new URL(`${localePrefix(locale)}/auth/callback`, siteUrl());
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "magiclink");
  return { url: url.toString() };
}
