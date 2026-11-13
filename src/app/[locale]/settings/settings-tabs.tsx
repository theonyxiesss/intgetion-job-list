import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { LinkTabs } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { flags } from "@/config/flags";

type Tab = "notifications" | "privacy" | "account" | "assistants";

/** DESIGN.md 9.0: «Уведомления · Приватность · Аккаунт». */
export async function SettingsTabs({ active }: { active: Tab }) {
  const t = await getTranslations("settings");
  const items: { key: Tab; label: string; href: string }[] = [
    { key: "account", label: t("tabAccount"), href: "/settings/account" },
    {
      key: "notifications",
      label: t("tabNotifications"),
      href: "/settings/notifications",
    },
    { key: "privacy", label: t("tabPrivacy"), href: "/settings/privacy" },
    {
      key: "assistants",
      label: t("tabAssistants"),
      href: "/settings/assistants",
    },
  ];

  // v2 (UI_V2): the mockup's segmented pills instead of underlined tabs.
  if (flags.uiV2Enabled) {
    return (
      <nav
        aria-label={t("title")}
        className="flex flex-wrap gap-1 self-start rounded-xl border border-line bg-surface-2 p-1"
      >
        {items.map((item) => {
          const on = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`min-h-9 rounded-lg px-3 py-2 text-sm font-medium ${on ? "bg-surface text-fg" : "text-fg-muted hover:text-fg"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <LinkTabs
      label={t("title")}
      indicatorName="settings-tab"
      items={[items[1]!, items[2]!, items[0]!, items[3]!].map((item) => ({
        label: item.label,
        href: item.href,
        active: item.key === active,
      }))}
    />
  );
}

const ICONS: Record<Tab, string> = {
  account: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  notifications: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  privacy: "M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5zM12 14v3",
  assistants:
    "M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z",
};

/**
 * Frame of every settings tab. With UI_V2 it is the mockup: «Settings» with a
 * vertical list of sections on the left, the section title and its blocks as
 * cards on the right. Without the flag it is the old header, tabs and column.
 */
export async function SettingsShell({
  active,
  title,
  children,
}: {
  active: Tab;
  title: string;
  children: ReactNode;
}) {
  if (!flags.uiV2Enabled) {
    return (
      <main className="py-10 md:py-16">
        <Container narrow className="flex flex-col gap-8">
          <PageHeader title={title} />
          <SettingsTabs active={active} />
          {children}
        </Container>
      </main>
    );
  }
  const t = await getTranslations("settings");
  const items: { key: Tab; label: string; href: string }[] = [
    { key: "account", label: t("tabAccount"), href: "/settings/account" },
    {
      key: "notifications",
      label: t("tabNotifications"),
      href: "/settings/notifications",
    },
    { key: "privacy", label: t("tabPrivacy"), href: "/settings/privacy" },
    {
      key: "assistants",
      label: t("tabAssistants"),
      href: "/settings/assistants",
    },
  ];
  const current = items.find((item) => item.key === active)!;
  return (
    <main className="px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 md:flex-row md:items-start">
        <div className="flex shrink-0 flex-col gap-4 md:sticky md:top-6 md:w-[260px]">
          <p className="text-[22px] font-semibold tracking-tight">
            {t("title")}
          </p>
          <nav aria-label={t("title")}>
            <ul className="flex gap-1 overflow-x-auto md:flex-col">
              {items.map((item) => {
                const on = item.key === active;
                return (
                  <li key={item.key} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={on ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm whitespace-nowrap ${on ? "bg-surface-2 font-medium text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg"}`}
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.7}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={ICONS[item.key]} />
                      </svg>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 md:max-w-[760px]">
          <h1 className="text-lg font-semibold">{current.label}</h1>
          <div className="flex flex-col gap-4 *:rounded-[18px] *:border *:border-line *:bg-surface *:p-5">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
