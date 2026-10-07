import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { CheckEmailWatch } from "@/components/auth/check-email-watch";

export default async function CheckEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthPage title={t("checkEmailTitle")}>
      <CheckEmailWatch />
      <p>{t("checkEmailBody")}</p>
      <p className="text-fg-muted">{t("checkEmailWaiting")}</p>
    </AuthPage>
  );
}
