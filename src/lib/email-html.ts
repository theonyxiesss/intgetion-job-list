import { PRODUCT_NAME } from "@/config/product";

/** Email clients ignore the site stylesheet, so the dark shell is inlined. */
const font = "Arial, Helvetica, sans-serif";
const display = '"Arial Narrow", Arial, Helvetica, sans-serif';

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Branded HTML shell for every outbound letter (D325): black page, near-black
 * card, wordmark, optional headline, body, primary button, footer link.
 */
export function siteEmailHtml(input: {
  /** Short line under the brand (e.g. "Confirm your email"). */
  headline?: string;
  body: string;
  action?: { href: string; label: string };
  footer?: { href: string; label: string };
  /** Hidden preview text some clients show in the inbox list. */
  preheader?: string;
}): string {
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(input.preheader)}</div>`
    : "";
  const headline = input.headline
    ? `<tr><td style="padding:8px 32px 0;font-family:${font};font-size:22px;font-weight:700;line-height:1.3;color:#f5f5f5;">${escapeEmailHtml(input.headline)}</td></tr>`
    : "";
  const body = escapeEmailHtml(input.body).replaceAll("\n", "<br>");
  const action = input.action
    ? `<tr><td style="padding:8px 32px 28px;">
<a href="${escapeEmailHtml(input.action.href)}" style="display:inline-block;background:#ffffff;color:#000000;font-family:${font};font-size:14px;font-weight:700;line-height:48px;padding:0 24px;text-decoration:none;border-radius:2px;">${escapeEmailHtml(input.action.label)}</a>
</td></tr>
<tr><td style="padding:0 32px 20px;font-family:${font};font-size:12px;line-height:1.5;color:#71717a;word-break:break-all;">${escapeEmailHtml(input.action.href)}</td></tr>`
    : "";
  const footer = input.footer
    ? `<tr><td style="padding:16px 32px 24px;border-top:1px solid #26262a;font-family:${font};font-size:12px;line-height:1.5;color:#71717a;">
<a href="${escapeEmailHtml(input.footer.href)}" style="color:#a1a1aa;text-decoration:underline;">${escapeEmailHtml(input.footer.label)}</a>
</td></tr>`
    : `<tr><td style="padding:16px 32px 24px;border-top:1px solid #26262a;font-family:${font};font-size:12px;line-height:1.5;color:#52525b;">${PRODUCT_NAME}</td></tr>`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#000000;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b0b0c;border:1px solid #26262a;">
<tr><td style="padding:28px 32px 12px;font-family:${display};font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#f5f5f5;">${PRODUCT_NAME}</td></tr>
<tr><td style="padding:0 32px;"><div style="height:1px;background:#26262a;line-height:1px;font-size:0;">&nbsp;</div></td></tr>
${headline}
<tr><td style="padding:16px 32px 24px;font-family:${font};font-size:16px;line-height:1.65;color:#d4d4d8;">${body}</td></tr>
${action}${footer}
</table>
</td></tr>
</table>
</body>
</html>`;
}
