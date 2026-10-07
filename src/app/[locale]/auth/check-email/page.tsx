import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { Link } from "@/i18n/navigation";

export default async function CheckEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthPage
      title={t("checkEmailTitle")}
      footer={
        <Link href="/login" className="underline underline-offset-4">
          {t("backToLogin")}
        </Link>
      }
    >
      <div className="flex flex-col gap-3">
        <p>{t("checkEmailBody")}</p>
        <p className="t-body-s text-fg-muted">{t("checkEmailHint")}</p>
      </div>
    </AuthPage>
  );
}
