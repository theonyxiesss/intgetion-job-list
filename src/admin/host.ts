/** Admin host and the flag that retires `/admin` on the public site (D251). */

// D335: English has no prefix, so the locale segment is optional.
const LOCALES = "(?:/(?:en|ru))?";

export function isAdminHost(host: string | null): boolean {
  const name = host?.split(":")[0]?.toLowerCase() ?? "";
  return name === "admin.intgetion.com" || name === "admin.localhost";
}

/** Default off. Set `ADMIN_HOST_ONLY=1` after the admin host is checked. */
export function adminHostOnly(
  value: string | undefined = process.env.ADMIN_HOST_ONLY,
): boolean {
  return value === "1" || value === "true";
}

export function isAdminSurface(pathname: string): boolean {
  return (
    new RegExp(`^${LOCALES}/admin(?:/|$)`).test(pathname) ||
    /^\/api\/admin(?:\/|$)/.test(pathname) ||
    /^\/api\/admin-auth(?:\/|$)/.test(pathname)
  );
}

export function adminHostAllows(pathname: string): boolean {
  return pathname === "/robots.txt" || isAdminSurface(pathname);
}

/** The bare admin host has no public home. Open the sign-in page. */
export function adminHostEntry(pathname: string): string | null {
  return pathname === "/" ? "/admin/login" : null;
}

/**
 * Main host with the flag on: admin URLs are gone.
 * Admin host: only the admin surface. Everything else is refused.
 */
export function adminPathStatus(input: {
  host: string | null;
  pathname: string;
  hostOnly: boolean;
}): 404 | null {
  if (isAdminHost(input.host)) {
    return adminHostAllows(input.pathname) ? null : 404;
  }
  if (input.hostOnly && isAdminSurface(input.pathname)) return 404;
  return null;
}

/** Origin a mutating request on this host must match. */
export function hostOrigin(host: string): string {
  const name = host.split(":")[0]?.toLowerCase() ?? "";
  const secure =
    name !== "admin.localhost" && name !== "localhost" && name !== "127.0.0.1";
  return `${secure ? "https" : "http"}://${host}`;
}

/**
 * CSRF site. The admin host and loopback (any port) must match the request
 * host, so a second local server can sign in. Public production stays on the
 * configured site URL.
 */
export function csrfSite(host: string | null, configuredSite: string): string {
  if (!host) return configuredSite;
  if (isAdminHost(host)) return hostOrigin(host);
  const name = host.split(":")[0]?.toLowerCase() ?? "";
  if (name === "127.0.0.1" || name === "localhost") return `http://${host}`;
  return configuredSite;
}
