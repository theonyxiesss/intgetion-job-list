import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgentBriefsControls } from "@/components/notifications/agent-briefs-switch";
import { NEW_JOB_TYPES } from "@/components/notifications/new-job-types";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read";
import { Link, redirect } from "@/i18n/navigation";
import { flags } from "@/config/flags";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import { Container, PageHeader } from "@/components/ui/container";
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
  const items = unread ? feed.items.filter((item) => !item.readAt) : feed.items;

  const controls = (
    <AgentBriefsControls
      hasProfile={profile}
      agentEnabled={agentOn}
      company={{
        member: employer,
        canManage: briefCompanies.some((company) =>
          ["owner", "admin"].includes(company.role),
        ),
        enabled: briefCompanies.some((company) => company.agentBriefsEnabled),
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
  );
  const textOf = (item: (typeof items)[number]) => {
    const key = catalogTitleKey(item.type);
    const payload = (item.payload ?? {}) as Record<string, string>;
    return {
      title: key ? types(`${key}.inapp.title`) : item.type,
      body: key
        ? types(`${key}.inapp.body`, {
            jobTitle: payload.jobTitle ?? "",
            status: payload.status ?? "",
            decision: payload.decision ?? "",
            companyName: payload.companyName ?? "",
            searchName: payload.searchName ?? "",
            serviceTitle: payload.serviceTitle ?? "",
            date: payload.expiresAt?.slice(0, 10) ?? "",
            count: Number(payload.applicationCount ?? payload.matchCount ?? 0),
          })
        : null,
    };
  };

  // v2 (UI_V2): the notifications mockup — feed and channels as two views.
  if (flags.uiV2Enabled) {
    const channels = view === "channels";
    const when = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const pill = (on: boolean) =>
      `min-h-9 rounded-lg px-3 py-2 text-sm font-medium ${on ? "bg-surface text-fg" : "text-fg-muted hover:text-fg"}`;
    return (
      <main className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="flex-1 text-[22px] font-semibold">{t("title")}</h1>
            <nav
              aria-label={t("tabsLabel")}
              className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
            >
              <Link
                href="/notifications"
                aria-current={!channels ? "page" : undefined}
                className={pill(!channels)}
              >
                {t("v2.feed")}
              </Link>
              <Link
                href="/notifications?view=channels"
                aria-current={channels ? "page" : undefined}
                className={pill(channels)}
              >
                {t("v2.channels")}
              </Link>
            </nav>
          </header>
          {channels ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-fg-muted">{t("v2.channelsText")}</p>
              <ul className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    key: "site",
                    icon: "M3 5h18v12H3zM8 21h8M12 17v4",
                    tone: "bg-surface-2 text-fg",
                    title: t("v2.site"),
                    status: t("v2.siteStatus"),
                    action: null,
                    on: true,
                  },
                  {
                    key: "telegram",
                    icon: "M21 4L3 11l6 2 2 6 3-4 5 4z",
                    tone: "bg-[#2aabee] text-white",
                    title: "Telegram",
                    status: telegram
                      ? t("v2.connectedAs", {
                          name: telegram.username
                            ? `@${telegram.username}`
                            : "Telegram",
                        })
                      : t("v2.notConnected"),
                    action: telegram ? null : "/settings/account",
                    on: Boolean(telegram),
                  },
                  {
                    key: "email",
                    icon: "M3 6h18v12H3zM3 7l9 6 9-6",
                    tone: "bg-fg text-bg",
                    title: t("v2.email"),
                    status: mailReady
                      ? t("v2.connected")
                      : t("v2.notConnected"),
                    action: mailReady ? null : "/settings/account",
                    on: mailReady,
                  },
                ].map((channel) => (
                  <li
                    key={channel.key}
                    className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-4"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${channel.tone}`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={channel.icon} />
                      </svg>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-semibold">
                        {channel.title}
                      </span>
                      <span className="truncate text-sm text-fg-muted">
                        {channel.status}
                      </span>
                    </span>
                    {channel.action ? (
                      <Link
                        href={channel.action}
                        className="flex min-h-9 items-center rounded-xl bg-fg px-3.5 text-sm font-semibold text-bg hover:opacity-90"
                      >
                        {t("v2.connect")}
                      </Link>
                    ) : (
                      <span className="flex min-h-9 items-center rounded-xl border border-line-strong px-3.5 text-sm text-fg-muted">
                        {t("v2.on")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {controls}
              <Link
                href="/settings/notifications"
                className="self-start text-sm text-accent"
              >
                {t("v2.fineTune")} →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <nav
                  aria-label={t("tabsLabel")}
                  className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
                >
                  <Link
                    href="/notifications"
                    aria-current={!unread ? "page" : undefined}
                    className={pill(!unread)}
                  >
                    {t("tabAll")} · {feed.items.length}
                  </Link>
                  <Link
                    href="/notifications?tab=unread"
                    aria-current={unread ? "page" : undefined}
                    className={pill(unread)}
                  >
                    {t("tabUnread")} · {feed.unreadCount}
                  </Link>
                </nav>
                <span className="flex-1" />
                <MarkAllReadButton label={t("markAll")} />
              </div>
              {items.length === 0 ? (
                <EmptyState title={t("empty")} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((item) => {
                    const text = textOf(item);
                    const fresh = !item.readAt;
                    return (
                      <li
                        key={item.id}
                        className={`flex items-start gap-3 rounded-[18px] border border-line p-4 ${fresh ? "bg-surface-2" : "bg-surface"}`}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-2">
                            <span
                              className={`text-[15px] ${fresh ? "font-semibold" : "font-medium"}`}
                            >
                              {text.title}
                            </span>
                            <time
                              dateTime={item.createdAt}
                              className="text-xs text-fg-subtle"
                            >
                              {when.format(new Date(item.createdAt))}
                            </time>
                          </span>
                          {text.body ? (
                            <span className="text-sm text-fg-muted">
                              {text.body}
                            </span>
                          ) : null}
                        </span>
                        {fresh ? (
                          <span
                            role="img"
                            aria-label={t("tabUnread")}
                            className="mt-2 size-2 shrink-0 rounded-full bg-accent"
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader
          title={t("title")}
          actions={<MarkAllReadButton label={t("markAll")} />}
        />
        {controls}
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
              const text = textOf(item);
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 border-b border-line py-4"
                >
                  <p className="t-h3">{text.title}</p>
                  <p className="text-fg-muted">{text.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
