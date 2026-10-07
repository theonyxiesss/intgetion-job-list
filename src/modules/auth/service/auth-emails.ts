import { siteEmailHtml } from "@/lib/email-html";
import type { AppLocale } from "@/i18n/routing";
import { siteUrl } from "@/lib/supabase/env";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";

export type AuthEmailKind =
  "signup" | "magiclink" | "recovery" | "email_change" | "invite" | "email_add";

type AuthMailCopy = {
  subject: string;
  headline: string;
  body: string;
  action: string;
  preheader: string;
};

function catalog(locale: AppLocale) {
  return (locale === "ru" ? ru : en).authEmails;
}

function copyFor(kind: AuthEmailKind, locale: AppLocale): AuthMailCopy {
  const c = catalog(locale);
  switch (kind) {
    case "signup":
      return c.signup;
    case "magiclink":
      return c.magiclink;
    case "recovery":
      return c.recovery;
    case "email_change":
      return c.emailChange;
    case "invite":
      return c.invite;
    case "email_add":
      return c.emailAdd;
  }
}

/** Maps Supabase `email_action_type` onto our letter kinds (D325). */
export function authEmailKindFromAction(action: string): AuthEmailKind | null {
  switch (action) {
    case "signup":
      return "signup";
    case "magiclink":
      return "magiclink";
    case "recovery":
      return "recovery";
    case "email_change":
      return "email_change";
    case "invite":
      return "invite";
    default:
      return null;
  }
}

export function renderAuthEmail(input: {
  kind: AuthEmailKind;
  locale: AppLocale;
  actionHref: string;
}): { subject: string; html: string; text: string } {
  const copy = copyFor(input.kind, input.locale);
  const html = siteEmailHtml({
    preheader: copy.preheader,
    headline: copy.headline,
    body: copy.body,
    action: { href: input.actionHref, label: copy.action },
  });
  const text = `${copy.headline}\n\n${copy.body}\n\n${input.actionHref}`;
  return { subject: copy.subject, html, text };
}

/**
 * Rewrites Auth `redirect_to` onto the public site origin (D326).
 * Supabase may still send localhost when Dashboard Site URL was left on
 * loopback; letters must never open there in production.
 */
export function publicAuthRedirect(
  redirectTo: string,
  publicSite: string = siteUrl(),
): string {
  const site = new URL(publicSite);
  let parsed: URL;
  try {
    parsed = new URL(redirectTo, site);
  } catch {
    return `${site.origin}/`;
  }
  const host = parsed.hostname.toLowerCase();
  const loopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1";
  if (!loopback && host === site.hostname.toLowerCase()) {
    return parsed.toString();
  }
  return new URL(
    `${parsed.pathname}${parsed.search}${parsed.hash}`,
    site.origin,
  ).toString();
}

/**
 * Verification URL that Auth emails must open (Supabase verify endpoint).
 * `redirectTo` is our `/{locale}/auth/callback` (with `next=reset` for recovery).
 */
export function authVerifyUrl(input: {
  supabaseUrl: string;
  tokenHash: string;
  type: string;
  redirectTo: string;
}): string {
  const url = new URL(`${input.supabaseUrl.replace(/\/$/, "")}/auth/v1/verify`);
  url.searchParams.set("token", input.tokenHash);
  url.searchParams.set("type", input.type);
  url.searchParams.set("redirect_to", input.redirectTo);
  return url.toString();
}

/** Prefer the person's locale from metadata; fall back to English. */
export function localeFromAuthUser(user: {
  user_metadata?: Record<string, unknown> | null;
}): AppLocale {
  const raw = user.user_metadata?.locale;
  return raw === "ru" ? "ru" : "en";
}
