import en from "@/messages/en.json";
import es from "@/messages/es.json";
import ptBR from "@/messages/pt-BR.json";
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
 * Go template; ru, es and pt-BR get their own copy, anything else English
 * (D350). The live letters go through the Send Email Hook; these files only
 * keep local Inbucket in step with it.
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

type TemplateLocale = "en" | "ru" | "es" | "pt-BR";

const catalogs = { en, ru, es, "pt-BR": ptBR } as const;

/** Languages with their own branch, in the order the template tests them. */
const BRANCHES = ["ru", "es", "pt-BR"] as const;

/** `{{ if ru }}…{{ else if es }}…{{ else if pt-BR }}…{{ else }}en{{ end }}`. */
function byLocale(render: (locale: TemplateLocale) => string): string {
  const branches = BRANCHES.map(
    (locale, i) =>
      `{{ ${i === 0 ? "if" : "else if"} eq (printf "%v" .Data.locale) "${locale}" }}${render(locale)}`,
  ).join("");
  return `${branches}{{ else }}${render("en")}{{ end }}`;
}

function bodyFor(kind: AuthTemplateKind, locale: TemplateLocale): string {
  const all = catalogs[locale].email;
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
  locale: TemplateLocale,
  values: { siteUrl: string; confirmationUrl: string },
): string {
  return bodyFor(kind, locale)
    .replaceAll("{{ .SiteURL }}", values.siteUrl)
    .replaceAll("{{ .ConfirmationURL }}", values.confirmationUrl);
}

/** One file per kind: every language's body behind a Go conditional. */
export function authTemplateHtml(kind: AuthTemplateKind): string {
  return `${byLocale((locale) => bodyFor(kind, locale))}\n`;
}

export function authTemplateSubject(kind: AuthTemplateKind): string {
  const key = copyKey[kind];
  return byLocale((locale) => catalogs[locale].email[key].subject);
}
