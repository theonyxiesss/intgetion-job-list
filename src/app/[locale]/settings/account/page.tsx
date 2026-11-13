import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountSignIn } from "@/components/settings/account-sign-in";
import {
  DeleteAccount,
  EmailLanguage,
} from "@/components/settings/settings-controls";
import { SecurityStubs } from "@/components/settings/security-stubs";
import { Alert } from "@/components/ui";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsShell } from "../settings-tabs";
import { RouteMessages } from "@/components/shell/route-messages";
import { LanguagePicker } from "@/components/shell/language-picker";
import { flags } from "@/config/flags";

export default async function AccountSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; provider?: string }>;
}) {
  const { locale } = await params;
  const { error, provider } = await searchParams;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("settings");

  return (
    <RouteMessages namespaces={["settings"]}>
      <SettingsShell active="account" title={t("title")}>
        <AccountSignIn
          locale={locale}
          user={user}
          error={error}
          provider={provider}
        />
        {flags.uiV2Enabled && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t("siteLanguage")}</h2>
            <p className="text-sm text-fg-muted">{t("siteLanguageHint")}</p>
            <LanguagePicker variant="grid" />
          </section>
        )}
        <EmailLanguage locale={user.locale} />
        <SecurityStubs />
        {user.platformRole === "admin" ? (
          <Alert tone="warning" title={t("adminCannotDelete")} />
        ) : (
          <DeleteAccount />
        )}
      </SettingsShell>
    </RouteMessages>
  );
}
