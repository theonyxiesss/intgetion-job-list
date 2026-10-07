import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  adminHostEntry,
  adminHostOnly,
  adminPathStatus,
  csrfSite,
  isAdminHost,
} from "./admin/host";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  routing,
} from "./i18n/routing";
import { isAllowedOrigin, needsOriginCheck } from "./lib/origin";
import { normalizeRequestId, REQUEST_ID_HEADER } from "./lib/request-id";
import {
  buildCsp,
  createNonce,
  TELEGRAM_WEB_APP_SCRIPT,
} from "./lib/security-headers";
import { siteUrl, supabaseUrl } from "./lib/supabase/env";
import { flags } from "./config/flags";
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
    // Wait briefly for telegram-web-app.js / the phone bridge before leaving /
    // so initData can be stashed when the hash is already empty (D324).
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="${TELEGRAM_WEB_APP_SCRIPT}"></script><script nonce="${bounceNonce}">(function(){function stash(){try{var h=location.hash||"";if(h.indexOf("tgWebAppData")!==-1)sessionStorage.setItem("tg_web_app_hash",h);var d=window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initData;if(d)sessionStorage.setItem("tg_web_app_init",d);}catch(e){}}function go(){stash();var l="en";try{if(/^ru\\b/i.test(navigator.language||""))l="ru";}catch(e){}var s=location.search;s+=(s?"&":"?")+"tgb=1";location.replace((l==="ru"?"/ru":"/")+s+location.hash);}var n=0;function tick(){stash();var ready=(location.hash||"").indexOf("tgWebAppData")!==-1||(window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initData);if(ready||n++>=10)go();else setTimeout(tick,100);}tick();})();</script></head><body></body></html>`;
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
    return stamp(
      NextResponse.next({ request: { headers: request.headers } }),
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
