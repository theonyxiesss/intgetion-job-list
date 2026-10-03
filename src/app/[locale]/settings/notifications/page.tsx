import { getTranslations, setRequestLocale } from "next-intl/server";
import { PreferenceToggles } from "@/components/notifications/preference-toggles";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <PreferenceToggles items={items} saved={t("saved")} error={t("error")} />
    </main>
  );
}
