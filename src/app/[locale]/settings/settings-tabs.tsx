import { getTranslations } from "next-intl/server";
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
