import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPage } from "@/components/auth/auth-page";
import { TelegramFinish } from "@/components/auth/telegram-finish";

export default async function TelegramReturnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthPage title={t("social.telegramTitle")}>
      <TelegramFinish />
    </AuthPage>
  );
}
