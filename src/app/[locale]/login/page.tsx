import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { LoginForm } from "@/components/auth/login-form";
import {
  isLoginNext,
  loginReturnHref,
  type LoginNext,
} from "@/components/auth/login-next";
import { SocialSignInStubs } from "@/components/auth/social-sign-in-stubs";
import { Link } from "@/i18n/navigation";
import { isRequestId } from "@/lib/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";

const callbackErrors = new Set([
  "auth_unavailable",
  "invalid_link",
  "missing_terms",
  "oauth_unavailable",
]);

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string; ref?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { error, next: rawNext, ref } = await searchParams;
  const next: LoginNext | undefined = isLoginNext(rawNext)
    ? rawNext
    : undefined;
  const failed = error && callbackErrors.has(error) ? error : undefined;
  // Only an id-shaped `ref` is echoed back (D606).
  const requestId =
    failed === "auth_unavailable" && isRequestId(ref) ? ref : undefined;
  if (!failed) {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    if (user) redirect(loginReturnHref(locale, next));
  }

  return (
    <AuthPage
      title={t("loginTitle")}
      footer={
        <>
          <Link href="/reset-password" className="underline underline-offset-4">
            {t("forgotPassword")}
          </Link>
          <p>
            {t("noAccount")}{" "}
            <Link
              href={
                next ? { pathname: "/register", query: { next } } : "/register"
              }
              className="underline underline-offset-4"
            >
              {t("toRegister")}
            </Link>
          </p>
        </>
      }
    >
      <LoginForm
        initialError={failed}
        initialRequestId={requestId}
        next={next}
      />
      <SocialSignInStubs next={next} />
    </AuthPage>
  );
}
