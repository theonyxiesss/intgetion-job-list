import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountSignIn } from "@/components/settings/account-sign-in";
import {
  AccountTypeSetting,
  DeleteAccount,
  EmailLanguage,
} from "@/components/settings/settings-controls";
import { SecurityStubs } from "@/components/settings/security-stubs";
import { Alert, Container, PageHeader } from "@/components/ui";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsTabs } from "../settings-tabs";
import { RouteMessages } from "@/components/shell/route-messages";

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
      <main className="py-10 md:py-16">
        <Container narrow className="flex flex-col gap-8">
          <PageHeader title={t("title")} />
          <SettingsTabs active="account" />
          <AccountSignIn
            locale={locale}
            user={user}
            error={error}
            provider={provider}
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
    </RouteMessages>
  );
}
