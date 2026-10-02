import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeCallback } from "@/modules/auth/service";

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
  const result = await completeCallback(supabase.auth, {
    code: query.get("code"),
    tokenHash: query.get("token_hash"),
    type: query.get("type"),
  });

  const target = new URL(`/${locale}`, siteUrl());
  if (!result.ok) {
    target.pathname = `/${locale}/login`;
    target.searchParams.set("error", result.reason);
  } else if (query.get("next") === "reset") {
    target.pathname = `/${locale}/reset-password`;
    target.searchParams.set("mode", "update");
  }
  return NextResponse.redirect(target);
}
