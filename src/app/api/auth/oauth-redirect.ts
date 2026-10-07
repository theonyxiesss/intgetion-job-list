import { NextResponse } from "next/server";
import { HttpError, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { siteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
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
  const next = query.get("next") === "chat" ? "chat" : undefined;
  const accept = provider === "google" ? isGoogleAuthorizeHost : isXAuthorizeHost;
  const start = provider === "google" ? startGoogleSignIn : startXSignIn;
  try {
    await enforceRateLimit("login", `${clientIp(request.headers)}|${provider}`);
    const supabase = await createSupabaseServerClient();
    const probe = await start(supabase.auth, { locale, next });
    const probed = await fetch(probe.url, { redirect: "manual" });
    if (!authorizeHostOk(probed.headers.get("location"), accept)) {
      const target = new URL(`/${locale}/login`, siteUrl());
      target.searchParams.set("error", "oauth_unavailable");
      return NextResponse.redirect(target);
    }
    const started = await start(supabase.auth, { locale, next });
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
    const target = new URL(`/${locale}/login`, siteUrl());
    target.searchParams.set("error", "oauth_unavailable");
    return NextResponse.redirect(target);
  }
}
