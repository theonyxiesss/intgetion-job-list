import { getTranslations, setRequestLocale } from "next-intl/server";
import { PreferenceToggles } from "@/components/notifications/preference-toggles";
import { Container, PageHeader } from "@/components/ui/container";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
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
  const types = await getTranslations("notifications.types");
  const preferences = await readPreferences(user.id);
  const items = preferences.map((item) => {
    const key = catalogTitleKey(item.type);
    return {
      type: item.type,
      channel: item.channel,
      enabled: item.enabled,
      label: key ? types(`${key}.inapp.title`) : item.type,
      channelLabel: item.channel === "email" ? t("email") : t("inapp"),
    };
  });

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        <PreferenceToggles
          items={items}
          saved={t("saved")}
          error={t("error")}
        />
      </Container>
    </main>
  );
}
