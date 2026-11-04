import { NextResponse } from "next/server";
import { HttpError, toErrorResponse } from "@/lib/http";
import { reportWarning } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { REQUEST_ID_HEADER } from "@/lib/request-id";
import { isAuthOutageStatus } from "@/lib/supabase/auth-health";
import { siteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { oauthNext } from "@/components/auth/login-next";
import {
  getCurrentUser,
  GOOGLE_TERMS_COOKIE,
  googleSignupMetadata,
  localeSchema,
  startGoogleSignIn,
  startXSignIn,
} from "@/modules/auth/service";

function authorizeHostOk(
  location: string | null,
  accept: (host: string) => boolean,
): boolean {
  if (location === null) return false;
  try {
    return accept(new URL(location).hostname);
  } catch {
    return false;
  }
}

/** Google's authorize host, including accounts.google.com (D335). */
export function isGoogleAuthorizeHost(host: string): boolean {
  return host.endsWith("google.com");
}

/** X and the older twitter.com authorize host (D336). */
export function isXAuthorizeHost(host: string): boolean {
  return (
    host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com")
  );
}

export type OAuthProbe = "ok" | "auth_unavailable" | "oauth_unavailable";

/**
 * What the Supabase authorize answer means (D606). A redirect to the
 * provider is "ok"; 402/5xx/no answer is all of Auth being down, so the
 * login page must not suggest another method; anything else (provider off,
 * bad redirect) is only this provider.
 */
export function oauthProbeOutcome(
  status: number,
  location: string | null,
  accept: (host: string) => boolean,
): OAuthProbe {
  if (authorizeHostOk(location, accept)) return "ok";
  if (isAuthOutageStatus(status)) return "auth_unavailable";
  return "oauth_unavailable";
}

function oauthFailed(
  request: Request,
  locale: string,
  link: boolean,
  reason: Exclude<OAuthProbe, "ok">,
): Response {
  const path = link ? `/${locale}/settings/account` : `/${locale}/login`;
  const target = new URL(path, siteUrl());
  // Linking keeps its own notice; the settings page knows only this one.
  const code = link ? "oauth_unavailable" : reason;
  target.searchParams.set("error", code);
  // Support id that matches this request's server log line (D606).
  const requestId = request.headers.get(REQUEST_ID_HEADER);
  if (code === "auth_unavailable" && requestId) {
    target.searchParams.set("ref", requestId);
  }
  return NextResponse.redirect(target);
}

/**
 * Starts Google or X and comes back through `/auth/callback`.
 * Opening the authorize link spends that attempt, so a live provider gets a second link.
 */

export async function redirectToOAuth(
  request: Request,
  provider: "google" | "x",
): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const locale = localeSchema.catch("en").parse(query.get("locale"));
  const link = query.get("link") === "1";
  const next = oauthNext(query.get("next"), link);
  const accept =
    provider === "google" ? isGoogleAuthorizeHost : isXAuthorizeHost;
  const start = provider === "google" ? startGoogleSignIn : startXSignIn;
  try {
    await enforceRateLimit("login", `${clientIp(request.headers)}|${provider}`);
    const supabase = await createSupabaseServerClient();
    if (link && !(await getCurrentUser(supabase.auth))) {
      return NextResponse.redirect(new URL(`/${locale}/login`, siteUrl()));
    }
    const probe = await start(supabase.auth, { locale, next, link });
    const probed = await fetch(probe.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    const outcome = probed
      ? oauthProbeOutcome(probed.status, probed.headers.get("location"), accept)
      : "auth_unavailable";
    if (outcome !== "ok") {
      if (outcome === "auth_unavailable") {
        reportWarning(
          { provider, status: probed?.status ?? 0 },
          "auth provider unavailable",
        );
      }
      return oauthFailed(request, locale, link, outcome);
    }
    const started = await start(supabase.auth, { locale, next, link });
    const response = NextResponse.redirect(started.url);
    response.cookies.set(
      GOOGLE_TERMS_COOKIE,
      JSON.stringify(googleSignupMetadata(locale)),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: `/${locale}/auth/callback`,
        maxAge: 60 * 10,
      },
    );
    return response;
  } catch (error) {
    if (error instanceof HttpError && error.status === 429) {
      return toErrorResponse(error);
    }
    return oauthFailed(request, locale, link, "oauth_unavailable");
  }
}
