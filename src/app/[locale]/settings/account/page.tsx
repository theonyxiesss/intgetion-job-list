import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccountSignIn } from "@/components/settings/account-sign-in";
import { localePrefix } from "@/i18n/paths";
import {
  getAuthUserLoginEmail,
  isPlaceholderEmail,
} from "@/lib/supabase/admin";
import type { CurrentUser } from "@/modules/auth/service";
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
  // v2: sign-in methods live under «Security and sign-in» (mockup), so a
  // link result that comes back here is shown there.
  if (flags.uiV2Enabled && (error || provider)) {
    const query = new URLSearchParams();
    if (error) query.set("error", error);
    if (provider) query.set("provider", provider);
    redirect(`${localePrefix(locale)}/settings/security?${query}`);
  }
  const user = await requireSettingsUser(locale);
  const t = await getTranslations("settings");
  if (flags.uiV2Enabled) {
    return <AccountSettingsV2 locale={locale} user={user} />;
  }
  return (
    <RouteMessages namespaces={["settings"]}>
      <SettingsShell active="account" title={t("title")}>
        <AccountSignIn
          locale={locale}
          user={user}
          error={error}
          provider={provider}
        />
        <EmailLanguage locale={user.locale} />
        <SecurityStubs />
        {user.platformRole === "admin" ? (
          <Alert tone="warning" title={t("adminCannotDelete")} />
        ) : (
          <DeleteAccount />
        )}
      </SettingsShell>
    </RouteMessages>
  );
}

/**
 * v2 (UI_V2) «Account» as in the mockup: name, email, password, interface
 * language, time zone and roles. Sign-in methods are under «Security and
 * sign-in», deleting the account under «Privacy and data».
 */
async function AccountSettingsV2({
  locale,
  user,
}: {
  locale: string;
  user: CurrentUser;
}) {
  const t = await getTranslations("settings");
  const [profile, candidate, companies, seller, creator, loginEmail] =
    await Promise.all([
      safe(readSharedProfile(user.id), null),
      safe(hasCandidateProfile(user.id), false),
      safe(getCompaniesForUser(user.id), []),
      safe(getSeller(user.id), null),
      safe(getOwnCreatorProfile(user.id), null),
      safe(getAuthUserLoginEmail(user.authUid), null),
    ]);
  const roles = [
    candidate ? t("v2.roleSeeker") : null,
    seller ? t("v2.roleFreelancer") : null,
    companies.length > 0 ? t("v2.roleEmployer") : null,
    creator ? t("v2.roleCreator") : null,
  ].filter(Boolean);
  const email =
    loginEmail && !isPlaceholderEmail(loginEmail) ? loginEmail : null;
  const languageName = languageLabel(locale);

  const rows = [
    {
      label: t("v2.name"),
      value: profile?.displayName ?? t("v2.notSet"),
      href: "/account#account-profile-section",
      action: t("v2.change"),
    },
    {
      label: t("v2.email"),
      value: email ? `${email} · ${t("v2.emailConfirmed")}` : t("v2.notSet"),
      href: "/settings/security",
      action: t("v2.change"),
    },
    {
      label: t("v2.password"),
      value: t("v2.passwordHint"),
      href: "/reset-password",
      action: t("v2.passwordChange"),
    },
  ];
  const laterRows = [
    {
      label: t("v2.timezone"),
      value: profile?.timezone ?? t("v2.notSet"),
      href: "/account#account-profile-section",
      action: t("v2.change"),
    },
    {
      label: t("v2.roles"),
      value: roles.length ? roles.join(" · ") : t("v2.notSet"),
      href: "/account",
      action: t("v2.configure"),
    },
  ];

  return (
    <RouteMessages namespaces={["settings"]}>
      <SettingsShell active="account" title={t("title")}>
        <section className="flex flex-col">
          {rows.map((row) => (
            <SettingsRow key={row.label} {...row} />
          ))}
          <details className="group border-b border-line py-3">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-fg-subtle">
                  {t("v2.language")}
                </span>
                <span className="text-sm">{languageName}</span>
              </span>
              <span className="flex min-h-9 items-center rounded-xl border border-line-strong px-3 text-sm">
                {t("v2.languageChange")}
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <LanguagePicker variant="grid" />
              <p className="text-xs text-fg-muted">{t("siteLanguageHint")}</p>
            </div>
          </details>
          {laterRows.map((row) => (
            <SettingsRow key={row.label} {...row} />
          ))}
        </section>
        <EmailLanguage locale={user.locale} />
      </SettingsShell>
    </RouteMessages>
  );
}

function SettingsRow({
  label,
  value,
  href,
  action,
}: {
  label: string;
  value: string;
  href: string;
  action: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-xs text-fg-subtle">{label}</span>
        <span className="text-sm break-words">{value}</span>
      </span>
      <Link
        href={href}
        className="flex min-h-9 items-center rounded-xl border border-line-strong px-3 text-sm"
      >
        {action}
      </Link>
    </div>
  );
}

/** The locale's own name, capitalised: «Русский», «English». */
function languageLabel(locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(
      locale,
    );
    if (!name) return locale;
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  } catch {
    return locale;
  }
}
