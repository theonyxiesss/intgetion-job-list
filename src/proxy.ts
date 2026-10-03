import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isAllowedOrigin } from "./lib/origin";
import { normalizeRequestId, REQUEST_ID_HEADER } from "./lib/request-id";
import { buildCsp, createNonce } from "./lib/security-headers";
import { siteUrl, supabaseUrl } from "./lib/supabase/env";
import { refreshSession } from "./lib/supabase/proxy";
import { markSession } from "./lib/supabase/session-mark";

const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // One id per request for logs (18.1); returned so a user can quote it.
  const requestId = normalizeRequestId(request.headers.get(REQUEST_ID_HEADER));
  request.headers.set(REQUEST_ID_HEADER, requestId);

  if (request.nextUrl.pathname.startsWith("/api/")) {
    // CSRF (section 6, P12): mutating API calls must come from the site.
    if (
      !isAllowedOrigin(request.method, request.headers.get("origin"), siteUrl())
    ) {
      const refused = NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cross-origin request" } },
        { status: 403 },
      );
      refused.headers.set(REQUEST_ID_HEADER, requestId);
      return refused;
    }
    const passed = NextResponse.next({
      request: { headers: request.headers },
    });
    passed.headers.set(REQUEST_ID_HEADER, requestId);
    return passed;
  }

  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    supabaseUrl: supabaseUrl(),
    isDev: process.env.NODE_ENV === "development",
  });
  // Next.js reads the nonce from the request CSP header while rendering.
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  // Refresh first: next-intl copies the request headers when it builds the response.
  const session = await refreshSession(request);
  markSession(request.headers, session.signedIn);
  const response = session.apply(handleI18nRouting(request));
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  // Skips Next.js internals and files with an extension (favicon.ico, …).
  matcher: "/((?!_next|_vercel|.*\\..*).*)",
};
