import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgentBriefsControls } from "@/components/notifications/agent-briefs-switch";
import { NEW_JOB_TYPES } from "@/components/notifications/new-job-types";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { canReceiveMail, telegramLinkOf } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import {
  hasCandidateProfile,
  ownAgentBriefsEnabled,
} from "@/modules/candidates/service";
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
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const { locale } = await params;
  const { tab, view } = await searchParams;
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
  const email = await getTranslations("notifications.emailAlerts");
  const agent = await getTranslations("notifications.agentBriefs");
  const companyAgent = await getTranslations("notifications.companyAgent");
  const [feed, preferences, telegram, mailReady, profile, companies] =
    await Promise.all([
      listNotifications(user.id, {}),
      readPreferences(user.id),
      telegramLinkOf(user),
      canReceiveMail(user),
      hasCandidateProfile(user.id),
      getCompaniesForUser(user.id),
    ]);
  const agentOn = profile ? await ownAgentBriefsEnabled(user.id) : false;
  // Recruiter and above get the employer brief (D368).
  const briefCompanies = companies.filter((company) =>
    ["owner", "admin", "recruiter"].includes(company.role),
  );
  const employer = briefCompanies.length > 0;
  function channelOn(channel: "telegram" | "email") {
    return NEW_JOB_TYPES.every((type) =>
      preferences.some(
        (item) =>
          item.type === type && item.channel === channel && item.enabled,
      ),
    );
  }
  const unread = tab === "unread";
  const channelsView = view === "channels";
  const items = unread ? feed.items.filter((item) => !item.readAt) : feed.items;
  const dateTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="py-6 md:py-8">
      <Container narrow className="flex flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {t("title")}
          </h1>
          <nav
            aria-label={t("viewsLabel")}
            className="flex rounded-xl border border-line bg-surface-2 p-1"
          >
            <Link
              href="/notifications"
              aria-current={!channelsView ? "page" : undefined}
              className="flex min-h-9 items-center rounded-lg px-3 text-sm text-fg-muted aria-current:bg-surface aria-current:text-fg"
            >
              {t("viewFeed")}
            </Link>
            <Link
              href="/notifications?view=channels"
              aria-current={channelsView ? "page" : undefined}
              className="flex min-h-9 items-center rounded-lg px-3 text-sm text-fg-muted aria-current:bg-surface aria-current:text-fg"
            >
              {t("viewChannels")}
            </Link>
          </nav>
        </header>
        {channelsView ? (
          <AgentBriefsControls
            hasProfile={profile}
            agentEnabled={agentOn}
            company={{
              member: employer,
              canManage: briefCompanies.some((company) =>
                ["owner", "admin"].includes(company.role),
              ),
              enabled: briefCompanies.some(
                (company) => company.agentBriefsEnabled,
              ),
            }}
            telegram={{
              linked: Boolean(telegram),
              enabled: channelOn("telegram"),
            }}
            email={{ linked: mailReady, enabled: channelOn("email") }}
            labels={{
              agentTitle: agent("title"),
              agentText: agent("text"),
              agentSaved: agent("saved"),
              agentError: agent("error"),
              agentOff: agent("off"),
              company: {
                title: companyAgent("title"),
                text: companyAgent("text"),
                saved: companyAgent("saved"),
                error: companyAgent("error"),
              },
              telegram: {
                title: employer ? bot("titleEmployer") : bot("title"),
                text: employer ? bot("textEmployer") : bot("text"),
                link: bot("link"),
                saved: bot("saved"),
                error: bot("error"),
              },
              email: {
                title: employer ? email("titleEmployer") : email("title"),
                text: employer ? email("textEmployer") : email("text"),
                link: email("link"),
                saved: email("saved"),
                error: email("error"),
              },
            }}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
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
              <MarkAllReadButton label={t("markAll")} />
            </div>
            {items.length === 0 ? (
              <EmptyState title={t("empty")} />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {items.map((item) => {
                  const key = catalogTitleKey(item.type);
                  const payload = (item.payload ?? {}) as Record<string, string>;
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-1 rounded-[18px] border border-line bg-surface px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {key ? types(`${key}.inapp.title`) : item.type}
                        </p>
                        <time
                          dateTime={item.createdAt}
                          className="font-mono text-xs text-fg-muted"
                        >
                          {dateTime.format(new Date(item.createdAt))}
                        </time>
                      </div>
                      <p className="text-fg-muted">
                        {key
                          ? types(`${key}.inapp.body`, {
                              jobTitle: payload.jobTitle ?? "",
                              status: payload.status ?? "",
                              decision: payload.decision ?? "",
                              companyName: payload.companyName ?? "",
                              searchName: payload.searchName ?? "",
                              serviceTitle: payload.serviceTitle ?? "",
                              date: payload.expiresAt?.slice(0, 10) ?? "",
                              count: Number(
                                payload.applicationCount ?? payload.matchCount ?? 0,
                              ),
                            })
                          : null}
                      </p>
                      {!item.readAt ? (
                        <span className="mt-1 flex items-center gap-2 text-xs text-accent">
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
                          {t("unreadLabel")}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </Container>
    </main>
  );
}
