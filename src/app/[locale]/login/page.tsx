import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { LoginForm } from "@/components/auth/login-form";
import { Link } from "@/i18n/navigation";

const callbackErrors = new Set(["invalid_link", "missing_terms"]);

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { error } = await searchParams;

  return (
    <AuthPage
      title={t("loginTitle")}
      footer={
        <>
          <Link href="/reset-password" className="underline">
            {t("forgotPassword")}
          </Link>
          <p>
            {t("noAccount")}{" "}
            <Link href="/register" className="underline">
              {t("toRegister")}
            </Link>
          </p>
        </>
      }
    >
      <LoginForm
        initialError={error && callbackErrors.has(error) ? error : undefined}
      />
    </AuthPage>
  );
}
