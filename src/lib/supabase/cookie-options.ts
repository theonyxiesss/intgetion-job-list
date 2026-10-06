import { siteUrl } from "./env";

/**
 * Cookie rules for the Supabase session (D314).
 *
 * The library's own default is `httpOnly: false`, because a browser client
 * needs to read the tokens. This app never creates one — every Supabase call
 * is made on the server — so the session is closed to scripts: an injected
 * script cannot read or copy it.
 *
 * `maxAge` is the library default, 400 days, which is the longest a browser
 * will keep a cookie. It is what «stay signed in» means: the session outlives
 * the window, and only signing out or Supabase refusing the refresh token
 * ends it.
 *
 * `secure` follows the site URL, so a production build served over plain http
 * (CI, local dev) still gets its cookies back.
 */
export function authCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: siteUrl().startsWith("https://"),
    maxAge: 400 * 24 * 60 * 60,
  };
}
