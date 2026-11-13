import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeChoice } from "@/components/settings/theme-choice";
import { RouteMessages } from "@/components/shell/route-messages";
import { flags } from "@/config/flags";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsShell } from "../settings-tabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("v2.tabAppearance"), robots: { index: false } };
}

/** v2 (UI_V2) «Appearance»: theme and site language. */
export default async function AppearanceSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!flags.uiV2Enabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSettingsUser(locale);
  const t = await getTranslations("settings");
  return (
    <RouteMessages namespaces={["settings"]}>
      <SettingsShell active="appearance" title={t("v2.tabAppearance")}>
        <ThemeChoice />
      </SettingsShell>
    </RouteMessages>
  );
}
