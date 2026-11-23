import { getTranslations, setRequestLocale } from "next-intl/server";
import { PreferenceMatrix } from "@/components/notifications/preference-matrix";
import { PreferenceToggles } from "@/components/notifications/preference-toggles";
import { flags } from "@/config/flags";
import { SettingsShell } from "../settings-tabs";
import { NOTIFICATION_GROUPS } from "./groups";
import { Link, redirect } from "@/i18n/navigation";
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
  if (flags.uiV2Enabled) {
    const v2 = await getTranslations("notificationSettings.v2");
    const channels = (["inapp", "email", "telegram"] as const)
      .filter((channel) => channel !== "telegram" || telegram)
      .map((channel) => ({
        id: channel,
        label: channel === "inapp" ? v2("inapp") : t(channel),
      }));
    const rows = NOTIFICATION_GROUPS.map((group) => {
      const types: string[] = [...group.types];
      const enabled = Object.fromEntries(
        channels.map(({ id }) => [
          id,
          types.every(
            (type) =>
              preferences.find(
                (item) => item.type === type && item.channel === id,
              )?.enabled ?? false,
          ),
        ]),
      );
      return { id: group.id, label: v2(`groups.${group.id}`), types, enabled };
    });
    return (
      <SettingsShell active="notifications" title={settings("title")}>
        <section className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted">{v2("intro")}</p>
          <PreferenceMatrix
            rows={rows}
            channels={channels}
            eventLabel={v2("event")}
            saved={t("saved")}
            error={t("error")}
          />
        </section>
        <section className="flex flex-col gap-3">
          <h2>{v2("channels")}</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex min-w-0 flex-col">
              <span className="text-xs text-fg-subtle">{t("telegram")}</span>
              <span className="text-sm">
                {telegram
                  ? telegram.username
                    ? `${v2("telegramLinked")} · @${telegram.username}`
                    : v2("telegramLinked")
                  : v2("telegramNotLinked")}
              </span>
            </span>
            {telegram ? null : (
              <Link
                href="/settings/security"
                className="flex min-h-9 items-center rounded-xl border border-line-strong px-3 text-sm"
              >
                {v2("connect")}
              </Link>
            )}
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <h2>{t("alwaysOnTitle")}</h2>
          <p className="text-sm text-fg-muted">{t("alwaysOnBody")}</p>
        </section>
      </SettingsShell>
    );
  }

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
    <SettingsShell active="notifications" title={settings("title")}>
      <PreferenceToggles items={items} saved={t("saved")} error={t("error")} />
      <section className="flex flex-col gap-2 border border-line p-4">
        <h2 className="t-label text-fg-muted">{t("alwaysOnTitle")}</h2>
        <p className="t-body-s max-w-[60ch] text-fg-muted">
          {t("alwaysOnBody")}
        </p>
      </section>
    </SettingsShell>
  );
}
