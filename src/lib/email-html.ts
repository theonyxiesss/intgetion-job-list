import { PRODUCT_NAME } from "@/config/product";

/**
 * One email layout for every letter the platform sends (D330): auth emails
 * (built into Supabase templates), notifications and account mail.
 *
 * Email clients ignore the site stylesheet and much of modern CSS, so this
 * is the old, safe dialect: nested tables, inline styles, a fixed 560 px
 * column for Outlook, no positioning, no flex/grid, no background images.
 * Colours are the site's light tokens; the light card survives the dark
 * modes of Gmail and Apple Mail better than a dark one.
 */

const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const display = "'Arial Narrow', Arial, Helvetica, sans-serif";

const color = {
  page: "#f4f4f5",
  card: "#ffffff",
  line: "#e4e4e7",
  fg: "#0a0a0a",
  muted: "#52525b",
  subtle: "#71717a",
  accent: "#000000",
  accentFg: "#ffffff",
} as const;

/** Where the logo image lives, relative to the site origin. */
export const EMAIL_LOGO_PATH = "/email/logo.png";

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type EmailLink = { href: string; label: string };

export type EmailJobCard = {
  title: string;
  company: string;
  /** "Berlin, DE" or null when the job names no place. */
  location: string | null;
  /** "Remote" / "Hybrid" / "On-site", already translated. */
  workFormat: string | null;
  /** Formatted range, e.g. "€60,000 – €80,000 / year". */
  salary: string | null;
  /** One or two plain sentences; trimmed by the caller. */
  summary: string | null;
  href: string;
};

export type EmailContent = {
  lang: "en" | "ru";
  /** Site origin for the logo, e.g. https://intgetion.com (no slash). */
  origin: string;
  /** Hidden inbox preview line. */
  preheader?: string;
  title?: string;
  /** Plain text; blank lines split paragraphs, single newlines stay. */
  body?: string;
  action?: EmailLink;
  /** Text above the copy-paste link; shown only with `action`. */
  fallbackLabel?: string;
  jobs?: EmailJobCard[];
  /** Label of the per-job link ("View job"). */
  jobAction?: string;
  /** Quiet action under the job list ("View all jobs"). */
  moreAction?: EmailLink;
  /** Small print under the action: expiry, "ignore this email". */
  notes?: string[];
  footer?: {
    /** Why the reader gets this email. */
    reason?: string;
    links?: EmailLink[];
  };
};

/**
 * Raw HTML passes through untouched when a value is wrapped in `raw()`:
 * Supabase templates need `{{ .ConfirmationURL }}` and Go conditionals.
 */
const RAW = Symbol("raw");
type Raw = { [RAW]: string };
export function raw(value: string): Raw {
  return { [RAW]: value };
}
function text(value: string | Raw): string {
  return typeof value === "string" ? escapeEmailHtml(value) : value[RAW];
}

function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(
      (part) =>
        `<p style="margin:0 0 16px;font-family:${font};font-size:16px;line-height:1.6;color:${color.muted};">${escapeEmailHtml(part).replaceAll("\n", "<br>")}</p>`,
    )
    .join("\n");
}

/** Table-cell button: Outlook paints the cell, everyone else the link. */
function primaryButton(href: string | Raw, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
<tr><td align="center" bgcolor="${color.accent}" style="background:${color.accent};">
<a href="${text(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${display};font-size:14px;font-weight:700;line-height:20px;letter-spacing:0.12em;text-transform:uppercase;color:${color.accentFg};text-decoration:none;">${escapeEmailHtml(label)}</a>
</td></tr>
</table>`;
}

function secondaryButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
<tr><td align="center" style="border:1px solid ${color.fg};">
<a href="${escapeEmailHtml(href)}" target="_blank" style="display:inline-block;padding:9px 16px;font-family:${display};font-size:12px;font-weight:700;line-height:18px;letter-spacing:0.12em;text-transform:uppercase;color:${color.fg};text-decoration:none;">${escapeEmailHtml(label)}</a>
</td></tr>
</table>`;
}

function jobCard(job: EmailJobCard, actionLabel: string): string {
  const where = [job.company, job.location].filter(Boolean).join(" · ");
  const meta = [job.workFormat, job.salary].filter(Boolean).join(" · ");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${color.line};margin:0 0 12px;">
<tr><td class="em-card" style="padding:18px 20px;">
<a href="${escapeEmailHtml(job.href)}" target="_blank" style="font-family:${font};font-size:17px;font-weight:700;line-height:1.35;color:${color.fg};text-decoration:none;word-break:break-word;overflow-wrap:anywhere;">${escapeEmailHtml(job.title)}</a>
<p style="margin:6px 0 0;font-family:${font};font-size:14px;line-height:1.5;color:${color.muted};word-break:break-word;overflow-wrap:anywhere;">${escapeEmailHtml(where)}</p>
${meta ? `<p style="margin:4px 0 0;font-family:${font};font-size:14px;line-height:1.5;color:${color.fg};">${escapeEmailHtml(meta)}</p>` : ""}
${job.summary ? `<p style="margin:10px 0 0;font-family:${font};font-size:14px;line-height:1.55;color:${color.muted};word-break:break-word;overflow-wrap:anywhere;">${escapeEmailHtml(job.summary)}</p>` : ""}
<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
${secondaryButton(job.href, actionLabel)}
</td></tr>
</table>`;
}

function row(content: string, padding = "0 40px"): string {
  return `<tr><td class="em-pad" style="padding:${padding};">${content}</td></tr>`;
}

/**
 * The layout as one function so the auth templates and the notification
 * dispatcher cannot drift apart. `action.href` may be `raw()`.
 */
export function renderEmailLayout(
  input: Omit<EmailContent, "action"> & {
    action?: { href: string | Raw; label: string };
  },
): string {
  const logo = `${input.origin}${EMAIL_LOGO_PATH}`;
  const parts: string[] = [];

  if (input.title) {
    parts.push(
      row(
        `<h1 style="margin:0 0 16px;font-family:${font};font-size:24px;font-weight:700;line-height:1.3;color:${color.fg};word-break:break-word;overflow-wrap:anywhere;">${escapeEmailHtml(input.title)}</h1>`,
      ),
    );
  }
  if (input.body) parts.push(row(paragraphs(input.body)));
  if (input.action) {
    parts.push(
      row(
        primaryButton(input.action.href, input.action.label),
        "8px 40px 24px",
      ),
    );
    if (input.fallbackLabel) {
      parts.push(
        row(
          `<p style="margin:0 0 6px;font-family:${font};font-size:13px;line-height:1.5;color:${color.subtle};">${escapeEmailHtml(input.fallbackLabel)}</p>
<p style="margin:0 0 24px;font-family:${font};font-size:13px;line-height:1.5;word-break:break-all;"><a href="${text(input.action.href)}" target="_blank" style="color:${color.fg};text-decoration:underline;">${text(input.action.href)}</a></p>`,
        ),
      );
    }
  }
  if (input.jobs?.length) {
    parts.push(
      row(
        input.jobs
          .map((job) => jobCard(job, input.jobAction ?? "View job"))
          .join("\n"),
        "8px 40px 12px",
      ),
    );
  }
  if (input.moreAction) {
    parts.push(
      row(
        primaryButton(input.moreAction.href, input.moreAction.label),
        "8px 40px 24px",
      ),
    );
  }
  if (input.notes?.length) {
    parts.push(
      row(
        input.notes
          .map(
            (note) =>
              `<p style="margin:0 0 8px;font-family:${font};font-size:13px;line-height:1.5;color:${color.subtle};">${escapeEmailHtml(note)}</p>`,
          )
          .join("\n"),
        "0 40px 16px",
      ),
    );
  }

  const footerLinks = (input.footer?.links ?? [])
    .map(
      (link) =>
        `<a href="${escapeEmailHtml(link.href)}" target="_blank" style="color:${color.muted};text-decoration:underline;">${escapeEmailHtml(link.label)}</a>`,
    )
    .join(" &nbsp;·&nbsp; ");
  const footer = `<tr><td class="em-pad" style="padding:20px 40px 28px;border-top:1px solid ${color.line};font-family:${font};font-size:12px;line-height:1.6;color:${color.subtle};">
${input.footer?.reason ? `<p style="margin:0 0 8px;">${escapeEmailHtml(input.footer.reason)}</p>` : ""}
${footerLinks ? `<p style="margin:0 0 8px;">${footerLinks}</p>` : ""}
<p style="margin:0;">${PRODUCT_NAME}</p>
</td></tr>`;

  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${color.page};opacity:0;">${escapeEmailHtml(input.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${input.lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${PRODUCT_NAME}</title>
<style>
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;}
a{color:inherit;}
@media only screen and (max-width:600px){
.em-pad{padding-left:24px!important;padding-right:24px!important;}
.em-card{padding:16px!important;}
.em-outer{padding:16px 8px!important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:${color.page};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${color.page}" style="background:${color.page};">
<tr><td align="center" class="em-outer" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${color.card}" style="max-width:560px;background:${color.card};border:1px solid ${color.line};">
<tr><td class="em-pad" style="padding:28px 40px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:12px;"><img src="${escapeEmailHtml(logo)}" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;outline:none;"></td>
<td valign="middle" style="font-family:${display};font-size:14px;font-weight:700;line-height:20px;letter-spacing:0.18em;color:${color.fg};white-space:nowrap;">${PRODUCT_NAME}</td>
</tr></table>
</td></tr>
<tr><td class="em-pad" style="padding:0 40px 28px;"><div style="height:1px;line-height:1px;font-size:0;background:${color.line};">&nbsp;</div></td></tr>
${parts.join("\n")}
${footer}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

function defaultOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://intgetion.com").replace(
    /\/+$/,
    "",
  );
}

/**
 * The older call shape (body + button + footer link), kept for the letters
 * that have no title yet: company verification and email-add (D231).
 */
export function siteEmailHtml(input: {
  body: string;
  title?: string;
  lang?: "en" | "ru";
  action?: EmailLink;
  fallbackLabel?: string;
  notes?: string[];
  footer?: EmailLink;
}): string {
  return renderEmailLayout({
    lang: input.lang ?? "en",
    origin: defaultOrigin(),
    preheader: input.body.split("\n")[0],
    ...(input.title ? { title: input.title } : {}),
    body: input.body,
    ...(input.action ? { action: input.action } : {}),
    ...(input.fallbackLabel ? { fallbackLabel: input.fallbackLabel } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    footer: input.footer ? { links: [input.footer] } : {},
  });
}
