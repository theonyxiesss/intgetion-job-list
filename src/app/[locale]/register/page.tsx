import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { RegisterForm } from "@/components/auth/register-form";
import {
  isLoginNext,
  loginReturnHref,
  type LoginNext,
} from "@/components/auth/login-next";
import {
  SignInTerms,
  SocialSignInStubs,
} from "@/components/auth/social-sign-in-stubs";
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { next: rawNext } = await searchParams;
  const next: LoginNext | undefined = isLoginNext(rawNext)
    ? rawNext
    : undefined;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (user) redirect(loginReturnHref(locale, next));

  return (
    <AuthPage
      title={flags.uiV2Enabled ? t("v2.registerTitle") : t("registerTitle")}
      intro={flags.uiV2Enabled ? t("v2.registerIntro") : undefined}
      mode="register"
      footer={
        <p>
          {t("haveAccount")}{" "}
          <Link
            href={next ? { pathname: "/login", query: { next } } : "/login"}
            className="underline underline-offset-4"
          >
            {t("toLogin")}
          </Link>
        </p>
      }
    >
      {flags.uiV2Enabled ? <SocialSignInStubs next={next} /> : null}
      <RegisterForm next={next} />
      {flags.uiV2Enabled ? <SignInTerms /> : <SocialSignInStubs next={next} />}
    </AuthPage>
  );
}
