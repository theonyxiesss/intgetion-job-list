import { getTranslations, setRequestLocale } from "next-intl/server";
import { PreferenceToggles } from "@/components/notifications/preference-toggles";
import { SettingsTabs } from "../settings-tabs";
import { Container, PageHeader } from "@/components/ui/container";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { telegramLinkOf } from "@/modules/auth/service";
import {
  catalogTitleKey,
  readPreferences,
} from "@/modules/notifications/service";

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect({ href: "/login", locale });
    }
    throw error;
  }

  const t = await getTranslations("notificationSettings");
  const settings = await getTranslations("settings");
  const types = await getTranslations("notifications.types");
  const [preferences, telegram] = await Promise.all([
    readPreferences(user.id),
    telegramLinkOf(user),
  ]);
  // Telegram switches only for an account with Telegram linked (D236).
  const items = preferences
    .filter((item) => item.channel !== "telegram" || telegram)
    .map((item) => {
      const key = catalogTitleKey(item.type);
      return {
        type: item.type,
        channel: item.channel,
        enabled: item.enabled,
        label: key ? types(`${key}.inapp.title`) : item.type,
        channelLabel: t(item.channel),
      };
    });

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={settings("title")} />
        <SettingsTabs active="notifications" />
        <PreferenceToggles
          items={items}
          saved={t("saved")}
          error={t("error")}
        />
        <section className="flex flex-col gap-2 border border-line p-4">
          <h2 className="t-label text-fg-muted">{t("alwaysOnTitle")}</h2>
          <p className="t-body-s max-w-[60ch] text-fg-muted">
            {t("alwaysOnBody")}
          </p>
        </section>
      </Container>
    </main>
  );
}
