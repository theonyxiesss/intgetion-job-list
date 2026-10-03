const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF check (section 6): a mutating request must carry an Origin equal to
 * the site origin. Requests without Origin are refused too.
 */
export function isAllowedOrigin(
  method: string,
  origin: string | null,
  siteUrl: string,
): boolean {
  if (safeMethods.has(method.toUpperCase())) return true;
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}
