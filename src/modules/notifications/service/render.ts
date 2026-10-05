import { siteEmailHtml } from "@/lib/email-html";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { NOTIFICATION_CATALOG, type NotificationType } from "../lib/catalog";

type EmailCopy = { subject: string; body: string };

const catalogs = { en, ru } as const;

export function emailCopy(
  locale: "en" | "ru",
  type: NotificationType,
): EmailCopy | null {
  const key = NOTIFICATION_CATALOG[type]
    .i18nKey as keyof typeof en.notifications.types;
  const block = catalogs[locale].notifications.types[key] as {
    email?: EmailCopy;
  };
  return block.email ?? null;
}

export function unsubscribeLabel(locale: "en" | "ru"): string {
  return catalogs[locale].notifications.unsubscribe.link;
}

/** `{name}` plus the `{count, plural, one {…} other {…}}` form used in the catalog. */
export function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  const withPlural = template.replace(
    /\{(\w+), plural, one \{([^}]*)\}(?: [a-z]+ \{[^}]*\})* other \{([^}]*)\}\}/g,
    (_match, name: string, one: string, other: string) => {
      const count = Number(values[name] ?? 0);
      const branch = count === 1 ? one : other;
      return branch.replaceAll("#", String(count));
    },
  );
  return withPlural.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(values[name] ?? ""),
  );
}

export function renderEmail(input: {
  locale: "en" | "ru";
  type: NotificationType;
  values: Record<string, string | number>;
  unsubscribeUrl: string;
  /** Catalog query of a saved-search alert, for its button (D234). */
  query?: string;
}): { subject: string; text: string; html: string } | null {
  const copy = emailCopy(input.locale, input.type);
  if (!copy) return null;
  const subject = fillTemplate(copy.subject, input.values);
  const body = fillTemplate(copy.body, input.values);
  const link = unsubscribeLabel(input.locale);
  const text = `${subject}\n\n${body}\n\n${link}: ${input.unsubscribeUrl}`;
  const origin = new URL(input.unsubscribeUrl).origin;
  const action =
    input.type === "matches.digest"
      ? {
          href: `${origin}/${input.locale}/matches`,
          label: catalogs[input.locale].digest.openMatches,
        }
      : input.type === "search.alert"
        ? {
            href: `${origin}/${input.locale}/jobs${input.query ? `?${input.query}` : ""}`,
            label: catalogs[input.locale].savedSearches.openSearch,
          }
        : undefined;
  const html = siteEmailHtml({
    body,
    ...(action ? { action } : {}),
    footer: { href: input.unsubscribeUrl, label: link },
  });
  return { subject, text, html };
}

export function templateValues(
  payload: Record<string, unknown>,
): Record<string, string | number> {
  const jobs = Array.isArray(payload.jobs)
    ? payload.jobs
        .map((job) =>
          job && typeof job === "object" && "jobTitle" in job
            ? String(job.jobTitle)
            : "",
        )
        .filter(Boolean)
        .join(", ")
    : "";
  const count =
    typeof payload.applicationCount === "number"
      ? payload.applicationCount
      : typeof payload.matchCount === "number"
        ? payload.matchCount
        : 1;
  const expires =
    typeof payload.expiresAt === "string" ? payload.expiresAt.slice(0, 10) : "";
  return {
    jobTitle: String(payload.jobTitle ?? jobs),
    status: String(payload.status ?? ""),
    decision: String(payload.decision ?? ""),
    companyName: String(payload.companyName ?? ""),
    searchName: String(payload.searchName ?? ""),
    date: expires,
    count,
    jobs,
  };
}

/** Where a notification leads, per type (D237). */
const NOTIFICATION_PATHS: Record<NotificationType, string> = {
  "application.created": "/employer/jobs",
  "application.viewed": "/applications",
  "application.status_changed": "/applications",
  "application.withdrawn": "/employer/jobs",
  "mutual_interest.revealed": "/contacts",
  "job.moderation_decided": "/employer/jobs",
  "job.expiring": "/employer/jobs",
  "job.closed": "/applications",
  "company.verification_decided": "/employer/company",
  "matches.digest": "/matches",
  "report.decided": "/notifications",
  "search.alert": "/saved-searches",
};

/**
 * The in-app title and text of a notification as a Telegram message, with
 * a link to the page it is about (D237). Plain text, no markup.
 */
export function telegramText(input: {
  locale: "en" | "ru";
  type: NotificationType;
  payload: Record<string, unknown>;
  siteUrl: string;
}): string | null {
  const key = NOTIFICATION_CATALOG[input.type]
    .i18nKey as keyof typeof en.notifications.types;
  const block = catalogs[input.locale].notifications.types[key] as {
    inapp?: { title: string; body: string };
  };
  if (!block.inapp) return null;
  const values = templateValues(input.payload);
  const title = fillTemplate(block.inapp.title, values);
  const body = fillTemplate(block.inapp.body, values);
  const link = `${input.siteUrl}/${input.locale}${NOTIFICATION_PATHS[input.type]}`;
  return `${title}
${body}

${link}`;
}
