import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountSignIn } from "@/components/settings/account-sign-in";
import {
  DeleteAccount,
  EmailLanguage,
} from "@/components/settings/settings-controls";
import { SecurityStubs } from "@/components/settings/security-stubs";
import { Alert } from "@/components/ui";
import { requireSettingsUser } from "../require-settings-user";
import { SettingsShell } from "../settings-tabs";
import { RouteMessages } from "@/components/shell/route-messages";
import { LanguagePicker } from "@/components/shell/language-picker";
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import { hasCandidateProfile } from "@/modules/candidates/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { getSeller } from "@/modules/freelance/service";
import { getOwnCreatorProfile } from "@/modules/ugc/service";
import { readSharedProfile } from "@/modules/users/service";

async function safe<T>(read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch {
    return fallback;
  }
}

export default async function AccountSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; provider?: string }>;
}) {
  const { locale } = await params;
  const { error, provider } = await searchParams;
  setRequestLocale(locale);
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("settings");
  // v2: the mockup's «Time zone» and «Roles» rows, read from the account.
  const facts = flags.uiV2Enabled
    ? await Promise.all([
        safe(readSharedProfile(user.id), null),
        safe(hasCandidateProfile(user.id), false),
        safe(getCompaniesForUser(user.id), []),
        safe(getSeller(user.id), null),
        safe(getOwnCreatorProfile(user.id), null),
      ])
    : null;
  const roles = facts
    ? [
        facts[1] ? t("v2.roleSeeker") : null,
        facts[3] ? t("v2.roleFreelancer") : null,
        facts[2].length > 0 ? t("v2.roleEmployer") : null,
        facts[4] ? t("v2.roleCreator") : null,
      ].filter(Boolean)
    : [];

  return (
    <RouteMessages namespaces={["settings"]}>
      <SettingsShell active="account" title={t("title")}>
        <AccountSignIn
          locale={locale}
          user={user}
          error={error}
          provider={provider}
        />
        {flags.uiV2Enabled && (
          <section className="flex flex-col">
            {[
              {
                label: t("v2.timezone"),
                value: facts?.[0]?.timezone ?? t("v2.notSet"),
                href: "/account#account-profile-section",
                action: t("v2.change"),
              },
              {
                label: t("v2.roles"),
                value: roles.length ? roles.join(" · ") : t("v2.notSet"),
                href: "/account",
                action: t("v2.configure"),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs text-fg-subtle">{row.label}</span>
                  <span className="text-sm">{row.value}</span>
                </span>
                <Link
                  href={row.href}
                  className="flex min-h-9 items-center rounded-xl border border-line-strong px-3 text-sm"
                >
                  {row.action}
                </Link>
              </div>
            ))}
          </section>
        )}
        {flags.uiV2Enabled && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t("siteLanguage")}</h2>
            <p className="text-sm text-fg-muted">{t("siteLanguageHint")}</p>
            <LanguagePicker variant="grid" />
          </section>
        )}
        <EmailLanguage locale={user.locale} />
        {flags.uiV2Enabled ? null : <SecurityStubs />}
        {user.platformRole === "admin" ? (
          <Alert tone="warning" title={t("adminCannotDelete")} />
        ) : (
          <DeleteAccount />
        )}
      </SettingsShell>
    </RouteMessages>
  );
}
