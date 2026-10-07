import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { raw, renderEmailLayout } from "./email-html";

/**
 * Auth emails stay with Supabase Auth (D7): it owns the tokens, the links
 * and the rate limits. We only give it our layout (D330). The files under
 * `supabase/templates/` are generated from this module; a test fails when
 * they drift. Regenerate with:
 *
 *   UPDATE_EMAIL_TEMPLATES=1 pnpm vitest run src/lib/auth-email-templates.test.ts
 *
 * Language: registration stores `locale` in user metadata, which Supabase
 * exposes as `.Data`. `printf "%v"` keeps a missing value from breaking the
 * Go template; anything but "ru" gets English.
 */

export const AUTH_TEMPLATE_KINDS = [
  "confirmation",
  "recovery",
  "magic_link",
] as const;
export type AuthTemplateKind = (typeof AUTH_TEMPLATE_KINDS)[number];

const copyKey = {
  confirmation: "confirm",
  recovery: "reset",
  magic_link: "magic",
} as const satisfies Record<AuthTemplateKind, keyof typeof en.email>;

const IS_RU = '{{ if eq (printf "%v" .Data.locale) "ru" }}';

function bodyFor(kind: AuthTemplateKind, locale: "en" | "ru"): string {
  const all = (locale === "ru" ? ru : en).email;
  const copy = all[copyKey[kind]];
  return renderEmailLayout({
    lang: locale,
    origin: "{{ .SiteURL }}",
    preheader: copy.body,
    title: copy.title,
    body: copy.body,
    action: { href: raw("{{ .ConfirmationURL }}"), label: copy.action },
    fallbackLabel: all.fallback,
    notes: [copy.expiry, copy.ignore],
    footer: { reason: all.footerAccount },
  });
}

/** What Supabase would send, with sample values (dev preview only). */
export function authTemplatePreview(
  kind: AuthTemplateKind,
  locale: "en" | "ru",
  values: { siteUrl: string; confirmationUrl: string },
): string {
  return bodyFor(kind, locale)
    .replaceAll("{{ .SiteURL }}", values.siteUrl)
    .replaceAll("{{ .ConfirmationURL }}", values.confirmationUrl);
}

/** One file per kind: Russian and English bodies behind a Go conditional. */
export function authTemplateHtml(kind: AuthTemplateKind): string {
  return `${IS_RU}${bodyFor(kind, "ru")}{{ else }}${bodyFor(kind, "en")}{{ end }}\n`;
}

export function authTemplateSubject(kind: AuthTemplateKind): string {
  const key = copyKey[kind];
  return `${IS_RU}${ru.email[key].subject}{{ else }}${en.email[key].subject}{{ end }}`;
}
