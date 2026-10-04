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
 * One dark card in the site's colours: black page, near-black panel,
 * white wordmark, a light button when the letter has a link to open.
 */
export function siteEmailHtml(input: {
  body: string;
  action?: { href: string; label: string };
  footer?: { href: string; label: string };
}): string {
  const body = escapeEmailHtml(input.body).replaceAll("\n", "<br>");
  const action = input.action
    ? `<tr><td style="padding:4px 32px 28px;">
<a href="${escapeEmailHtml(input.action.href)}" style="display:inline-block;background:#ffffff;color:#000000;font-family:${font};font-size:14px;font-weight:700;line-height:44px;padding:0 20px;text-decoration:none;">${escapeEmailHtml(input.action.label)}</a>
</td></tr>`
    : "";
  const footer = input.footer
    ? `<tr><td style="padding:16px 32px 24px;border-top:1px solid #26262a;font-family:${font};font-size:12px;line-height:1.5;color:#71717a;">
<a href="${escapeEmailHtml(input.footer.href)}" style="color:#a1a1aa;text-decoration:underline;">${escapeEmailHtml(input.footer.label)}</a>
</td></tr>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b0b0c;border:1px solid #26262a;">
<tr><td style="padding:28px 32px 12px;font-family:${display};font-size:13px;font-weight:700;letter-spacing:0.14em;color:#f5f5f5;">${PRODUCT_NAME}</td></tr>
<tr><td style="padding:0 32px;"><div style="height:1px;background:#26262a;line-height:1px;font-size:0;">&nbsp;</div></td></tr>
<tr><td style="padding:20px 32px 24px;font-family:${font};font-size:16px;line-height:1.6;color:#f5f5f5;">${body}</td></tr>
${action}${footer}
</table>
</td></tr>
</table>
</body>
</html>`;
}
