import { getTranslations } from "next-intl/server";
import { LinkTabs } from "@/components/ui";

/** DESIGN.md 9.0: «Уведомления · Приватность · Аккаунт». */
export async function SettingsTabs({
  active,
}: {
  active: "notifications" | "privacy" | "account";
}) {
  const t = await getTranslations("settings");
  return (
    <LinkTabs
      label={t("title")}
      indicatorName="settings-tab"
      items={[
        {
          label: t("tabNotifications"),
          href: "/settings/notifications",
          active: active === "notifications",
        },
        {
          label: t("tabPrivacy"),
          href: "/settings/privacy",
          active: active === "privacy",
        },
        {
          label: t("tabAccount"),
          href: "/settings/account",
          active: active === "account",
        },
      ]}
    />
  );
}
