import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { RegisterForm } from "@/components/auth/register-form";
import { Link } from "@/i18n/navigation";

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
  const { next } = await searchParams;
  const backToChat = next === "chat" ? "chat" : undefined;

  return (
    <AuthPage
      title={t("registerTitle")}
      footer={
        <p>
          {t("haveAccount")}{" "}
          <Link
            href={
              backToChat
                ? { pathname: "/login", query: { next: "chat" } }
                : "/login"
            }
            className="underline underline-offset-4"
          >
            {t("toLogin")}
          </Link>
        </p>
      }
    >
      <RegisterForm next={backToChat} />
    </AuthPage>
  );
}
