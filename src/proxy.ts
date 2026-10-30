import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  adminHostEntry,
  adminHostOnly,
  adminPathStatus,
  csrfSite,
  isAdminHost,
} from "./admin/host";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, routing } from "./i18n/routing";
import { isAllowedOrigin, needsOriginCheck } from "./lib/origin";
import { normalizeRequestId, REQUEST_ID_HEADER } from "./lib/request-id";
import { embedOriginForPath } from "./lib/embedded-sites";
import {
  buildCsp,
  createNonce,
  TELEGRAM_WEB_APP_SCRIPT,
} from "./lib/security-headers";
import { isCryptoPayPath } from "./lib/crypto-pay-path";
import { isUgcRoomPath } from "./lib/ugc-room-path";
import { siteUrl, supabaseUrl } from "./lib/supabase/env";
import { flags } from "./config/flags";
import { TELEGRAM_MINI_APP_BOUNCE_SCRIPT } from "./lib/telegram-web-app-boot";
import { refreshSession } from "./lib/supabase/proxy";
import { markSession } from "./lib/supabase/session-mark";

const handleI18nRouting = createMiddleware(routing);

function stamp(response: NextResponse, requestId: string, adminHost: boolean) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  if (adminHost) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  // One id per request for logs (18.1); returned so a user can quote it.
  const requestId = normalizeRequestId(request.headers.get(REQUEST_ID_HEADER));
  request.headers.set(REQUEST_ID_HEADER, requestId);
  request.headers.set("x-pathname", request.nextUrl.pathname);

  const host = request.headers.get("host");
  const adminHost = isAdminHost(host);
  const entry = adminHost ? adminHostEntry(request.nextUrl.pathname) : null;
  if (entry) {
    const url = request.nextUrl.clone();
    url.pathname = entry;
    return stamp(NextResponse.redirect(url, 307), requestId, true);
  }
  const blocked = adminPathStatus({
    host,
    pathname: request.nextUrl.pathname,
    hostOnly: adminHostOnly(),
  });
  if (blocked) {
    return stamp(
      new NextResponse("Not found", { status: 404 }),
      requestId,
      adminHost,
    );
  }

  if (request.nextUrl.pathname === "/robots.txt") {
    if (adminHost) {
      return stamp(
        new NextResponse("User-agent: *\nDisallow: /\n", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
        requestId,
        true,
      );
    }
    return stamp(
      NextResponse.next({ request: { headers: request.headers } }),
      requestId,
      false,
    );
  }

  // Mini App: an HTTP redirect drops #tgWebAppData on many phone webviews.
  // Bounce in the page so the fragment survives (D322). Since D335 English is
  // the root itself, so the bounce marks its target with `tgb=1`; the old
  // `/en` entry is bounced the same way instead of redirected.
  const pathname = request.nextUrl.pathname;
  if (
    !adminHost &&
    flags.telegramMiniAppEnabled &&
    (pathname === "/" || pathname === "/en") &&
    !request.nextUrl.searchParams.has("tgb")
  ) {
    const bounceNonce = createNonce();
    const bounceCsp = buildCsp({
      nonce: bounceNonce,
      supabaseUrl: supabaseUrl(),
      isDev: process.env.NODE_ENV === "development",
      includeSupabase: false,
      allowTelegramFrame: true,
    });
    // Phone clients send initData after ready(). Wait up to 5s, stash it,
    // then leave with the hash still attached (D324, D426).
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="${TELEGRAM_WEB_APP_SCRIPT}"></script><script nonce="${bounceNonce}">${TELEGRAM_MINI_APP_BOUNCE_SCRIPT}</script></head><body></body></html>`;
    return stamp(
      new NextResponse(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy": bounceCsp,
          "cache-control": "no-store",
        },
      }),
      requestId,
      false,
    );
  }

  // D335: English has no prefix. Old `/en/...` links move for good.
  // An `/en` link is also how the language switch says «English», so the
  // choice is remembered like any other (otherwise a saved `ru` would send
  // the visitor straight back).
  if (/^\/en(?=\/|$)/.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en/, "") || "/";
    const response = NextResponse.redirect(url, 308);
    response.cookies.set(LOCALE_COOKIE, "en", {
      path: "/",
      sameSite: "lax",
      maxAge: LOCALE_COOKIE_MAX_AGE,
    });
    return stamp(response, requestId, adminHost);
  }

  const originSite = csrfSite(host, siteUrl());

  if (request.nextUrl.pathname.startsWith("/api/")) {
    // CSRF (section 6, P12): mutating API calls must come from this host.
    if (
      needsOriginCheck(request.nextUrl.pathname) &&
      !isAllowedOrigin(
        request.method,
        request.headers.get("origin"),
        originSite,
      )
    ) {
      return stamp(
        NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Cross-origin request" } },
          { status: 403 },
        ),
        requestId,
        adminHost,
      );
    }
    // API routes write their own response, so the refresh has to happen
    // here — before the handler — or two parallel calls both rotate the
    // same refresh token (D398). The admin host keeps its own session.
    const session = adminHost ? null : await refreshSession(request);
    if (session) markSession(request.headers, session.signedIn);
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    return stamp(
      session ? session.apply(response) : response,
      requestId,
      adminHost,
    );
  }

  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    supabaseUrl: supabaseUrl(),
    isDev: process.env.NODE_ENV === "development",
    includeSupabase: !adminHost,
    // Never on the admin host: it is framed by nobody (D251, D259).
    allowTelegramFrame: !adminHost && flags.telegramMiniAppEnabled,
    // No foreign frame (D400). The admin host stays closed.
    embedOrigin: adminHost
      ? undefined
      : embedOriginForPath(request.nextUrl.pathname),
    // WalletConnect relay, verify, and the AppKit modal only while paying (D403, D406).
    allowWalletConnect: !adminHost && isCryptoPayPath(request.nextUrl.pathname),
    allowVideoEmbeds: !adminHost && isUgcRoomPath(request.nextUrl.pathname),
  });
  // Next.js reads the nonce from the request CSP header while rendering.
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  // The admin host does not refresh the public site session (D251).
  const session = adminHost ? null : await refreshSession(request);
  if (session) markSession(request.headers, session.signedIn);
  const response = session
    ? session.apply(handleI18nRouting(request))
    : handleI18nRouting(request);
  response.headers.set("Content-Security-Policy", csp);
  return stamp(response, requestId, adminHost);
}

export const config = {
  // Skips Next.js internals and files with an extension, except robots.txt
  // so the admin host can refuse crawlers (D251).
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/robots.txt"],
};
