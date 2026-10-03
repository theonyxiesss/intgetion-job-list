import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isAllowedOrigin } from "./lib/origin";
import { buildCsp, createNonce } from "./lib/security-headers";
import { siteUrl, supabaseUrl } from "./lib/supabase/env";
import { refreshSession } from "./lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // CSRF (section 6, P12): mutating API calls must come from the site.
    if (
      !isAllowedOrigin(request.method, request.headers.get("origin"), siteUrl())
    ) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cross-origin request" } },
        { status: 403 },
      );
    }
    return NextResponse.next();
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
  const applySession = await refreshSession(request);
  const response = applySession(handleI18nRouting(request));
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Skips Next.js internals and files with an extension (favicon.ico, …).
  matcher: "/((?!_next|_vercel|.*\\..*).*)",
};
