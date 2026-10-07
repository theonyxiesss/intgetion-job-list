import type { NextRequest } from "next/server";
import {
  AUTH_TEMPLATE_KINDS,
  authTemplatePreview,
  type AuthTemplateKind,
} from "@/lib/auth-email-templates";
import { siteEmailHtml } from "@/lib/email-html";
import { renderEmail, toEmailJob } from "@/modules/notifications/service";

/**
 * Dev-only email previews (D330): `/dev-emails/index.html`, then e.g.
 * `/dev-emails/recovery.ru.html`. The dot in the path keeps the page out of
 * the proxy, so the site CSP does not strip the email's inline styles.
 */

const LONG =
  "Senior Staff Platform Infrastructure Engineer (Distributed Systems, Kubernetes, Observability)";

function sampleJobs(locale: "en" | "ru") {
  const money = (amount: string) => ({
    amountMinor: amount,
    currency: "EUR",
    period: "year" as const,
    basis: "gross" as const,
  });
  return [
    {
      id: "00000000-0000-0000-0000-000000000001",
      title: LONG,
      description:
        "We run payments infrastructure for remote-first teams across Europe. You will own the reliability of our core platform, lead incident reviews and mentor engineers.",
      location: null,
      locationCountry: "DE",
      workFormat: "remote",
      salaryMin: money("9000000"),
      salaryMax: money("12000000"),
      company: {
        name: "Very Long Company Name Holdings International GmbH & Co. KG",
      },
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      title: "Product Designer",
      description: "Design the hiring flow end to end.",
      location: "Lisbon",
      locationCountry: "PT",
      workFormat: "hybrid",
      salaryMin: null,
      salaryMax: null,
      company: { name: "Acme" },
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      title: "Backend Engineer, Go",
      description: null,
      location: null,
      locationCountry: null,
      workFormat: "onsite",
      salaryMin: money("6000000"),
      salaryMax: null,
      company: { name: "Northwind" },
    },
  ].map((job) => toEmailJob(job, locale));
}

function page(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  if (process.env.NODE_ENV === "production") return page("Not found", 404);
  const { file } = await params;
  const origin = request.nextUrl.origin;

  if (file === "index.html") {
    const names = [
      ...AUTH_TEMPLATE_KINDS,
      "jobs",
      "notification",
      "email-add",
    ].flatMap((kind) => [`${kind}.en.html`, `${kind}.ru.html`]);
    return page(
      `<!doctype html><meta charset="utf-8"><title>Email previews</title><ul>${names
        .map((name) => `<li><a href="/dev-emails/${name}">${name}</a></li>`)
        .join("")}</ul>`,
    );
  }

  const match = /^([a-z_-]+)\.(en|ru)\.html$/.exec(file);
  if (!match) return page("Not found", 404);
  const kind = match[1]!;
  const locale = match[2] as "en" | "ru";
  const unsubscribeUrl = `${origin}/${locale}/unsubscribe?token=preview`;

  if ((AUTH_TEMPLATE_KINDS as readonly string[]).includes(kind)) {
    return page(
      authTemplatePreview(kind as AuthTemplateKind, locale, {
        siteUrl: origin,
        confirmationUrl: `${origin}/auth/v1/verify?token=pkce_0123456789abcdef0123456789abcdef0123456789abcdef&type=${kind}&redirect_to=${encodeURIComponent(`${origin}/${locale}/auth/callback`)}`,
      }),
    );
  }
  if (kind === "jobs") {
    const rendered = renderEmail({
      locale,
      type: "matches.digest",
      values: { count: 7 },
      unsubscribeUrl,
      actionPath: "/matches",
      jobs: sampleJobs(locale),
    });
    return page(rendered?.html ?? "no template");
  }
  if (kind === "jobs-live") {
    // The newest real jobs from the connected DB, as the digest would send them.
    const { jobSearchQuery } = await import("@/modules/jobs/schemas/search");
    const { searchJobs } = await import("@/modules/jobs/service");
    const { items } = await searchJobs(
      jobSearchQuery.parse({ sort: "newest", limit: 3 }),
      locale,
    );
    const rendered = renderEmail({
      locale,
      type: "matches.digest",
      values: { count: items.length },
      unsubscribeUrl,
      actionPath: "/matches",
      jobs: items.map((job) => toEmailJob(job, locale)),
    });
    return page(rendered?.html ?? "no template");
  }
  if (kind === "notification") {
    const rendered = renderEmail({
      locale,
      type: "application.status_changed",
      values: { jobTitle: LONG, status: "interview" },
      unsubscribeUrl,
      actionPath: "/applications",
    });
    return page(rendered?.html ?? "no template");
  }
  if (kind === "email-add") {
    return page(
      siteEmailHtml({
        lang: locale,
        title: locale === "ru" ? "Подтвердите email" : "Confirm your email",
        body:
          locale === "ru"
            ? "Откройте ссылку, чтобы добавить этот адрес к аккаунту."
            : "Open the link to add this address to your account.",
        action: {
          href: `${origin}/${locale}/settings/email/confirm?token=preview`,
          label: locale === "ru" ? "Подтвердить" : "Confirm",
        },
        fallbackLabel:
          locale === "ru"
            ? "Если кнопка не работает, скопируйте эту ссылку в браузер:"
            : "If the button does not work, copy this link into your browser:",
      }),
    );
  }
  return page("Not found", 404);
}
