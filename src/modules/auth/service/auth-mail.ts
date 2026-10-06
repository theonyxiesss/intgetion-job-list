import { siteEmailHtml } from "@/lib/email-html";
import { logger } from "@/lib/logger";
import { authLinkTokenHash, type AuthLinkType } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import type { AppLocale } from "@/i18n/routing";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import type { ConfirmationMailer } from "./email-change";

/**
 * Letters for signing in, sent by us rather than by Supabase (D320).
 *
 * Supabase would send its own, from its own address and in its own template,
 * and its built-in mail allows only a couple of letters an hour. We ask it
 * only for the one-time token, then write to the person from our domain in
 * the site's own dark card — the same template as every other letter we send.
 */
type Kind = "confirm" | "signIn" | "reset";

const LINK_TYPE: Record<Kind, AuthLinkType> = {
  confirm: "signup",
  signIn: "magiclink",
  reset: "recovery",
};

function copyFor(kind: Kind, locale: AppLocale) {
  const all = (locale === "ru" ? ru : en).auth.mail;
  return all[kind];
}

/** Where the link lands: the ordinary callback, reset asks for a new password. */
function callback(kind: Kind, locale: AppLocale, tokenHash: string): string {
  const url = new URL(`/${locale}/auth/callback`, siteUrl());
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", LINK_TYPE[kind]);
  if (kind === "reset") url.searchParams.set("next", "reset");
  return url.toString();
}

/**
 * Sends one of the three letters. Returns false when the token could not be
 * minted or the mail could not go out, so the caller can fall back to
 * Supabase's own letter rather than leave the person with nothing.
 */
export async function sendAuthMail(
  kind: Kind,
  input: { email: string; locale: AppLocale; password?: string },
  mailer: ConfirmationMailer,
): Promise<boolean> {
  const tokenHash = await authLinkTokenHash(
    LINK_TYPE[kind],
    input.email,
    input.password,
  );
  if (!tokenHash) return false;
  const link = callback(kind, input.locale, tokenHash);
  const copy = copyFor(kind, input.locale);
  try {
    const outcome = await mailer({
      to: input.email,
      subject: copy.subject,
      text: `${copy.body}\n\n${link}\n\n${copy.ignore}`,
      html: siteEmailHtml({
        body: copy.body,
        action: { href: link, label: copy.action },
        note: copy.ignore,
      }),
    });
    if (outcome === "skipped") return false;
    return true;
  } catch (error) {
    logger.warn({ err: error, kind }, "auth mail failed");
    return false;
  }
}
