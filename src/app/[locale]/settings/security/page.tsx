import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AccountSignIn } from "@/components/settings/account-sign-in";
import { SecurityStubs } from "@/components/settings/security-stubs";
import { SignOutOthers } from "@/components/settings/sign-out-others";
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
  return { title: t("v2.tabSecurity"), robots: { index: false } };
}

/**
 * v2 (UI_V2) «Security and sign-in» as in the mockup: sign-in methods,
 * other devices and the coming options.
 */
export default async function SecuritySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; provider?: string }>;
}) {
  if (!flags.uiV2Enabled) notFound();
  const { locale } = await params;
  const { error, provider } = await searchParams;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("settings");
  return (
    <RouteMessages namespaces={["settings"]}>
      <SettingsShell active="security" title={t("v2.tabSecurity")}>
        <AccountSignIn
          locale={locale}
          user={user}
          error={error}
          provider={provider}
        />
        <SignOutOthers />
        <SecurityStubs />
      </SettingsShell>
    </RouteMessages>
  );
}
