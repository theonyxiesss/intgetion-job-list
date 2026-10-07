import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { LoginForm, type LoginNext } from "@/components/auth/login-form";
import { SocialSignInStubs } from "@/components/auth/social-sign-in-stubs";
import { Link } from "@/i18n/navigation";

const callbackErrors = new Set([
  "invalid_link",
  "missing_terms",
  "oauth_unavailable",
]);

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { error, next: rawNext } = await searchParams;
  const next: LoginNext | undefined =
    rawNext === "chat" || rawNext === "post-job" ? rawNext : undefined;

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
                next === "chat"
                  ? { pathname: "/register", query: { next: "chat" } }
                  : "/register"
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
        initialError={error && callbackErrors.has(error) ? error : undefined}
        next={next}
      />
      <SocialSignInStubs next={next === "chat" ? "chat" : undefined} />
    </AuthPage>
  );
}
