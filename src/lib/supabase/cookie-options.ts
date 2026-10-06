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
export function authCookieOptions(options: { framed?: boolean } = {}) {
  const https = siteUrl().startsWith("https://");
  // Inside a cross-site frame — the Mini App on Telegram Web — a browser
  // refuses to store a Lax cookie at all, so the person is signed out on
  // every open. There the session is written as None + Partitioned: sent
  // inside the frame, and kept in a jar of its own per embedding site (D315).
  if (options.framed && https) {
    return {
      path: "/",
      sameSite: "none" as const,
      httpOnly: true,
      secure: true,
      partitioned: true,
      maxAge: 400 * 24 * 60 * 60,
    };
  }
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: https,
    maxAge: 400 * 24 * 60 * 60,
  };
}

/**
 * True when this request was made by a page inside someone else's frame.
 * A document loaded in an iframe says so in `Sec-Fetch-Dest`; a fetch made
 * by that page carries the marker cookie the frame's first response set.
 */
export const FRAMED_COOKIE = "tg_frame";

/**
 * Set on a phone Mini App login. It is not `tg_frame`: that marker makes
 * later requests write Partitioned cookies, which a phone webview drops.
 */
export const MINI_APP_COOKIE = "tg_app";

export function isFramedRequest(headers: Headers, cookie?: string): boolean {
  if (headers.get("sec-fetch-dest") === "iframe") return true;
  const jar = cookie ?? headers.get("cookie") ?? "";
  return jar
    .split(";")
    .some((part) => part.trim().startsWith(`${FRAMED_COOKIE}=`));
}

/** The marker itself: readable by nobody, sent inside the frame. */
export function framedMarkerCookie(): string {
  return `${FRAMED_COOKIE}=1; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=${400 * 24 * 60 * 60}`;
}

/** First-party marker for the phone webview. Lax, so the webview keeps it. */
export function phoneMiniAppCookie(): string {
  return `${MINI_APP_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${400 * 24 * 60 * 60}`;
}

export function hasMiniAppMarker(headers: Headers): boolean {
  const jar = headers.get("cookie") ?? "";
  return jar
    .split(";")
    .some((part) => part.trim().startsWith(`${MINI_APP_COOKIE}=`));
}
