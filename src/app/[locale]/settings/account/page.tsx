import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  DeleteAccount,
  AccountTypeSetting,
  EmailLanguage,
} from "@/components/settings/settings-controls";
import { SecurityStubs } from "@/components/settings/security-stubs";
import { SignInMethods } from "@/components/settings/sign-in-methods";
import {
  authAdminAvailable,
  getAuthUserLoginEmail,
  isPlaceholderEmail,
} from "@/lib/supabase/admin";
import { flags } from "@/config/flags";
import { siteUrl } from "@/lib/supabase/env";
import {
  telegramAuthUrl,
  telegramBotId,
  telegramBotToken,
  telegramLinkOf,
} from "@/modules/auth/service";
import { Alert, Container, PageHeader } from "@/components/ui";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsTabs } from "../settings-tabs";
import { localePrefix } from "@/i18n/paths";

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("settings");
  const [loginEmail, telegram] = await Promise.all([
    getAuthUserLoginEmail(user.authUid),
    telegramLinkOf(user),
  ]);
  const token = telegramBotToken();
  // Linking returns to the same page Telegram sign-in uses, in "link" mode (D230).
  const linkHref =
    flags.telegramLoginEnabled && token && authAdminAvailable()
      ? telegramAuthUrl({
          botId: telegramBotId(token),
          origin: siteUrl(),
          returnTo: `${siteUrl()}${localePrefix(locale)}/auth/telegram?link=1`,
        })
      : null;

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        <SettingsTabs active="account" />
        <SignInMethods
          email={
            loginEmail && !isPlaceholderEmail(loginEmail) ? loginEmail : null
          }
          telegram={telegram ? { username: telegram.username } : null}
          linkHref={linkHref}
        />
        <AccountTypeSetting value={user.accountType} />
        <EmailLanguage locale={user.locale} />
        <SecurityStubs />
        {user.platformRole === "admin" ? (
          <Alert tone="warning" title={t("adminCannotDelete")} />
        ) : (
          <DeleteAccount />
        )}
      </Container>
    </main>
  );
}
