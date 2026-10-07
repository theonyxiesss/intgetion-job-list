import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { CheckEmailWatch } from "@/components/auth/check-email-watch";
import { Link } from "@/i18n/navigation";

export default async function CheckEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ resent?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { resent } = await searchParams;
  const again = resent === "1";

  return (
    <AuthPage
      title={t("checkEmailTitle")}
      footer={
        <Link href="/login" className="underline underline-offset-4">
          {t("backToLogin")}
        </Link>
      }
    >
      <CheckEmailWatch />
      <p>{again ? t("checkEmailResentBody") : t("checkEmailBody")}</p>
      <p className="text-fg-muted">{t("checkEmailWaiting")}</p>
    </AuthPage>
  );
}
