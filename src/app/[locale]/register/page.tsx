import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { RegisterForm } from "@/components/auth/register-form";
import {
  isLoginNext,
  loginReturnHref,
  type LoginNext,
} from "@/components/auth/login-next";
import { SocialSignInStubs } from "@/components/auth/social-sign-in-stubs";
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
  const next: LoginNext | undefined = isLoginNext(rawNext) ? rawNext : undefined;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (user) redirect(loginReturnHref(locale, next));

  return (
    <AuthPage
      title={t("registerTitle")}
      footer={
        <p>
          {t("haveAccount")}{" "}
          <Link
            href={
              next
                ? { pathname: "/login", query: { next } }
                : "/login"
            }
            className="underline underline-offset-4"
          >
            {t("toLogin")}
          </Link>
        </p>
      }
    >
      <RegisterForm next={next} />
      <SocialSignInStubs next={next} />
    </AuthPage>
  );
}
