/**
 * The bare site root answers with a redirect to a locale. A 307 drops the
 * URL fragment inside Telegram's webview, and that fragment is the signed
 * Mini App payload (D319). This page moves to the same locale in the browser,
 * so the fragment stays.
 */

const localePath = /^\/(?:en|ru)\/?$/;

/** Path next-intl would have redirected `/` to, or null if it is not a locale. */
export function localeEntryPath(location: string | null): string | null {
  if (!location) return null;
  try {
    const url = new URL(location, "https://intgetion.com");
    if (!localePath.test(url.pathname)) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

/** HTML document: the script keeps `location.hash`, the link is for clients without it. */
export function hashPreservingEntryHtml(path: string, nonce: string): string {
  const target = JSON.stringify(path);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>INTGETION JOB LIST</title><link rel="canonical" href="${path}"><script nonce="${nonce}">location.replace(${target}+location.hash)</script></head><body><p><a href="${path}">INTGETION JOB LIST</a></p></body></html>`;
}
