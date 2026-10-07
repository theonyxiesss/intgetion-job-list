import { renderEmailLayout, type EmailJobCard } from "@/lib/email-html";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { NOTIFICATION_CATALOG, type NotificationType } from "../lib/catalog";
import type { EmailJobPayload } from "../lib/email-jobs";

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
  locale: "en" | "ru" = "en",
): string {
  const rules = new Intl.PluralRules(locale);
  const withPlural = template.replace(
    /\{(\w+), plural, ((?:[a-z]+ \{[^}]*\} ?)+)\}/g,
    (_match, name: string, forms: string) => {
      const count = Number(values[name] ?? 0);
      const branches = new Map(
        [...forms.matchAll(/([a-z]+) \{([^}]*)\}/g)].map(
          ([, key, value]) => [key, value] as const,
        ),
      );
      const branch =
        branches.get(rules.select(count)) ?? branches.get("other") ?? "";
      return branch.replaceAll("#", String(count));
    },
  );
  return withPlural.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(values[name] ?? ""),
  );
}

/** Cards for the email, at most DIGEST-size, with links to the job pages. */
function jobCards(
  jobs: EmailJobPayload[],
  locale: "en" | "ru",
  origin: string,
): EmailJobCard[] {
  const copy = catalogs[locale].email.jobs;
  return jobs.slice(0, EMAIL_MAX_JOBS).map((job) => ({
    title: job.title,
    company: job.companyName,
    location: job.location,
    workFormat: job.workFormat ? copy.formats[job.workFormat] : null,
    salary: job.salary
      ? `${job.salary.min}${job.salary.max ? ` – ${job.salary.max}` : ""} / ${
          copy.per[job.salary.period as keyof typeof copy.per] ??
          job.salary.period
        }`
      : null,
    summary: job.summary,
    href: `${origin}/${locale}/jobs/${encodeURIComponent(job.jobId)}`,
  }));
}

/** At most this many cards in one email; the rest are one click away. */
export const EMAIL_MAX_JOBS = 5;

export function renderEmail(input: {
  locale: "en" | "ru";
  type: NotificationType;
  values: Record<string, string | number>;
  unsubscribeUrl: string;
  /** Page the email button opens, without locale (D188, D234, D240). */
  actionPath?: string;
  /** Full job cards (D330); without them the email lists titles in text. */
  jobs?: EmailJobPayload[];
}): { subject: string; text: string; html: string } | null {
  const copy = emailCopy(input.locale, input.type);
  if (!copy) return null;
  const subject = fillTemplate(copy.subject, input.values, input.locale);
  const body = fillTemplate(copy.body, input.values, input.locale);
  const link = unsubscribeLabel(input.locale);
  const origin = new URL(input.unsubscribeUrl).origin;
  const mail = catalogs[input.locale].email;
  const footer = {
    links: [
      {
        href: `${origin}/${input.locale}/settings/notifications`,
        label: mail.manage,
      },
      { href: input.unsubscribeUrl, label: link },
    ],
  };

  // New matching jobs (D330): cards instead of a run-on list of titles.
  const cards =
    input.type === "matches.digest" && input.jobs?.length
      ? jobCards(input.jobs, input.locale, origin)
      : [];
  if (cards.length > 0) {
    const title = mail.jobs.title;
    const intro = fillTemplate(
      mail.jobs.intro,
      { count: input.values.count ?? cards.length },
      input.locale,
    );
    const allHref = `${origin}/${input.locale}${input.actionPath ?? "/matches"}`;
    const text = [
      title,
      intro,
      ...cards.map((card) =>
        [
          card.title,
          [card.company, card.location].filter(Boolean).join(" · "),
          card.href,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
      `${mail.jobs.viewAll}: ${allHref}`,
      `${link}: ${input.unsubscribeUrl}`,
    ].join("\n\n");
    const html = renderEmailLayout({
      lang: input.locale,
      origin,
      preheader: intro,
      title,
      body: intro,
      jobs: cards,
      jobAction: mail.jobs.viewJob,
      moreAction: { href: allHref, label: mail.jobs.viewAll },
      footer: { reason: mail.footerAlerts, ...footer },
    });
    return { subject: title, text, html };
  }

  const text = `${subject}\n\n${body}\n\n${link}: ${input.unsubscribeUrl}`;
  const actionLabel =
    input.type === "matches.digest"
      ? catalogs[input.locale].digest.openMatches
      : input.type === "search.alert"
        ? catalogs[input.locale].savedSearches.openSearch
        : input.type === "company.new_jobs"
          ? catalogs[input.locale].follows.openCompany
          : null;
  const action =
    actionLabel && input.actionPath
      ? {
          href: `${origin}/${input.locale}${input.actionPath}`,
          label: actionLabel,
        }
      : undefined;
  const html = renderEmailLayout({
    lang: input.locale,
    origin,
    preheader: body,
    title: subject,
    body,
    ...(action ? { action } : {}),
    footer,
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

/**
 * Where a notification leads, without locale (D237): the email button and
 * the Telegram link. Payload fields refine it where the type allows.
 */
export function notificationPath(
  type: NotificationType,
  payload: Record<string, unknown>,
): string {
  switch (type) {
    case "application.viewed":
    case "application.status_changed":
    case "job.closed":
      return "/applications";
    case "application.created":
    case "application.withdrawn":
    case "job.moderation_decided":
    case "job.expiring":
      return "/employer/jobs";
    case "mutual_interest.revealed":
      return "/contacts";
    case "company.verification_decided":
      return "/employer/company";
    case "matches.digest":
      return "/matches";
    case "search.alert":
      return typeof payload.query === "string" && payload.query
        ? `/jobs?${payload.query}`
        : "/saved-searches";
    case "company.new_jobs":
      return typeof payload.companySlug === "string"
        ? `/companies/${encodeURIComponent(payload.companySlug)}?tab=jobs`
        : "/saved-searches";
    default:
      return "/notifications";
  }
}

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
  const title = fillTemplate(block.inapp.title, values, input.locale);
  const body = fillTemplate(block.inapp.body, values, input.locale);
  const link = `${input.siteUrl}/${input.locale}${notificationPath(input.type, input.payload)}`;
  return `${title}
${body}

${link}`;
}
