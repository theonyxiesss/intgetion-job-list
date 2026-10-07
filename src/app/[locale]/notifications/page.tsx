import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BotAlertsSwitch,
  NEW_JOB_TYPES,
} from "@/components/notifications/bot-alerts-switch";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { telegramLinkOf } from "@/modules/auth/service";
import {
  catalogTitleKey,
  listNotifications,
  readPreferences,
} from "@/modules/notifications/service";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
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

  const t = await getTranslations("notifications");
  const types = await getTranslations("notifications.types");
  const bot = await getTranslations("notifications.bot");
  const [feed, preferences, telegram] = await Promise.all([
    listNotifications(user.id, {}),
    readPreferences(user.id),
    telegramLinkOf(user),
  ]);
  const botEnabled = NEW_JOB_TYPES.every((type) =>
    preferences.some(
      (item) =>
        item.type === type && item.channel === "telegram" && item.enabled,
    ),
  );
  const unread = tab === "unread";
  const items = unread ? feed.items.filter((item) => !item.readAt) : feed.items;

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader
          title={t("title")}
          actions={<MarkAllReadButton label={t("markAll")} />}
        />
        <BotAlertsSwitch
          linked={Boolean(telegram)}
          enabled={botEnabled}
          labels={{
            title: bot("title"),
            text: bot("text"),
            link: bot("link"),
            saved: bot("saved"),
            error: bot("error"),
          }}
        />
        <LinkTabs
          label={t("tabsLabel")}
          indicatorName="notification-tabs"
          items={[
            {
              label: t("tabAll"),
              href: "/notifications",
              active: !unread,
              count: feed.items.length,
            },
            {
              label: t("tabUnread"),
              href: "/notifications?tab=unread",
              active: unread,
              count: feed.unreadCount,
            },
          ]}
        />
        {items.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => {
              const key = catalogTitleKey(item.type);
              const payload = (item.payload ?? {}) as Record<string, string>;
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 border-b border-line py-4"
                >
                  <p className="t-h3">
                    {key ? types(`${key}.inapp.title`) : item.type}
                  </p>
                  <p className="text-fg-muted">
                    {key
                      ? types(`${key}.inapp.body`, {
                          jobTitle: payload.jobTitle ?? "",
                          status: payload.status ?? "",
                          decision: payload.decision ?? "",
                          companyName: payload.companyName ?? "",
                          searchName: payload.searchName ?? "",
                          date: payload.expiresAt?.slice(0, 10) ?? "",
                          count: Number(
                            payload.applicationCount ?? payload.matchCount ?? 0,
                          ),
                        })
                      : null}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
