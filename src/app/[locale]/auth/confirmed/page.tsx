import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { EmailConfirmedNotify } from "@/components/auth/email-confirmed-notify";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/** Shown after a successful email confirm link (D326). */
export default async function EmailConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthPage title={t("confirmedTitle")}>
      <EmailConfirmedNotify />
      <p>{t("confirmedBody")}</p>
      <div>
        <ButtonLink href="/">{t("confirmedContinue")}</ButtonLink>
      </div>
    </AuthPage>
  );
}
