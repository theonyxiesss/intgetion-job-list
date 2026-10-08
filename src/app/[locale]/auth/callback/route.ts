import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientIp } from "@/lib/request-ip";
import { signupMetadata } from "@/modules/auth/schemas";
import {
  auditSignIn,
  completeCallback,
  GOOGLE_TERMS_COOKIE,
} from "@/modules/auth/service";
import {
  readyEmailWait,
  signedInPath,
} from "@/modules/auth/service/email-wait";
import { localePrefix } from "@/i18n/paths";
import {
  isLoginNext,
  loginReturnLocation,
} from "@/components/auth/login-next";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const query = request.nextUrl.searchParams;

  const supabase = await createSupabaseServerClient();
  let terms = signupMetadata.safeParse(undefined);
  try {
    terms = signupMetadata.safeParse(
      JSON.parse(request.cookies.get(GOOGLE_TERMS_COOKIE)?.value ?? "null"),
    );
  } catch {
    terms = signupMetadata.safeParse(undefined);
  }
  const result = await completeCallback(
    supabase.auth,
    {
      code: query.get("code"),
      tokenHash: query.get("token_hash"),
      type: query.get("type"),
    },
    terms.success ? terms.data : undefined,
  );

  const rawNext = query.get("next") ?? undefined;
  const backToAccount = rawNext === "account";
  if (result.ok && !backToAccount) {
    await auditSignIn(result.user, "email_link", clientIp(request.headers));
  }

  const target = new URL(`${localePrefix(locale)}`, siteUrl());
  if (!result.ok) {
    target.pathname = backToAccount
      ? `${localePrefix(locale)}/settings/account`
      : `${localePrefix(locale)}/login`;
    target.searchParams.set("error", result.reason);
  } else if (rawNext === "reset") {
    target.pathname = `${localePrefix(locale)}/reset-password`;
    target.searchParams.set("mode", "update");
  } else if (isLoginNext(rawNext)) {
    const dest = loginReturnLocation(locale, rawNext);
    target.pathname = dest.pathname;
    target.search = dest.search;
  } else if (backToAccount) {
    target.pathname = `${localePrefix(locale)}/settings/account`;
  } else if (result.created && result.user.accountType === "employer") {
    // A new employer starts with the company profile (D331).
    target.pathname = `${localePrefix(locale)}/employer/company`;
  } else {
    const wait = query.get("wait");
    if (wait) {
      const purpose = await readyEmailWait(wait, result.user);
      if (purpose) {
        const handed = NextResponse.redirect(signedInPath(locale, purpose));
        handed.cookies.set(GOOGLE_TERMS_COOKIE, "", {
          path: `${localePrefix(locale)}/auth/callback`,
          maxAge: 0,
        });
        return handed;
      }
    }
    // Same-device open, or wait handoff unavailable: success page (D326).
    // A new employer starts with the company profile instead (D331).
    target.pathname =
      result.created && result.user.accountType === "employer"
        ? `${localePrefix(locale)}/employer/company`
        : `${localePrefix(locale)}/auth/confirmed`;
  }
  const response = NextResponse.redirect(target);
  response.cookies.set(GOOGLE_TERMS_COOKIE, "", {
    path: `/${locale}/auth/callback`,
    maxAge: 0,
  });
  return response;
}
