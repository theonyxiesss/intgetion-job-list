import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  DeleteAccount,
  EmailLanguage,
} from "@/components/settings/settings-controls";
import { Alert, Container, PageHeader } from "@/components/ui";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsTabs } from "../settings-tabs";

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("settings");

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        <SettingsTabs active="account" />
        <EmailLanguage locale={user.locale} />
        {user.platformRole === "admin" ? (
          <Alert tone="warning" title={t("adminCannotDelete")} />
        ) : (
          <DeleteAccount />
        )}
      </Container>
    </main>
  );
}
