import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { RegisterForm } from "@/components/auth/register-form";
import { SocialSignInStubs } from "@/components/auth/social-sign-in-stubs";
import { Link } from "@/i18n/navigation";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthPage
      title={t("registerTitle")}
      footer={
        <p>
          {t("haveAccount")}{" "}
          <Link href="/login" className="underline">
            {t("toLogin")}
          </Link>
        </p>
      }
    >
      <RegisterForm />
      <SocialSignInStubs />
    </AuthPage>
  );
}
