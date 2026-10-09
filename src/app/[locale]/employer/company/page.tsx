import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Alert, Badge, Container, StatusBadge } from "@/components/ui";
import { seatCap } from "@/lib/billing/seats";
import { getAuthUserEmail } from "@/lib/supabase/admin";
import { CompanyTabs } from "./company-tabs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { companyHasActiveTeam } from "@/modules/billing/service";
import {
  getCompaniesForUser,
  listCompanyMembers,
} from "@/modules/companies/service";
import { CompanyForm } from "@/modules/companies/ui/company-form";
import { TeamSeats } from "@/modules/companies/ui/team-seats";
import { localePrefix } from "@/i18n/paths";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function EmployerCompanyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);
  const companies = await getCompaniesForUser(user.id);
  const company = companies[0];
  const t = await getTranslations("company");
  const formText = {
    name: t("form.name"),
    domain: t("form.domain"),
    website: t("form.website"),
    linkedin: t("form.linkedin"),
    telegram: t("form.telegram"),
    x: t("form.x"),
    description: t("form.description"),
    timezone: t("form.timezone"),
    timezoneHint: t("form.timezoneHint"),
    logo: t("form.logo"),
    save: t("form.save"),
    error: t("form.error"),
    saved: t("form.saved"),
  };
  const canEdit =
    company &&
    company.origin !== "imported" &&
    (company.role === "owner" || company.role === "admin");
  const ownCompany =
    company && company.origin !== "imported" && company.role === "owner"
      ? company
      : null;
  const members = ownCompany ? await listCompanyMembers(ownCompany.id) : [];
  const cap = ownCompany
    ? seatCap(await companyHasActiveTeam(ownCompany.id))
    : 2;
  const people = await Promise.all(
    members.map(async (member) => {
      const email = await getAuthUserEmail(member.auth_uid);
      const name = member.full_name?.trim() || null;
      const who = email ?? name ?? t(`team.roles.${member.role}`);
      return {
        userId: member.user_id,
        role: member.role,
        label: `${who} · ${t(`team.roles.${member.role}`)}`,
      };
    }),
  );
  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="t-label text-fg-muted">{t("title")}</p>
          <h1 className="t-display-l">
            {company ? company.name : t("createTitle")}
          </h1>
          {company && (
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={company.status}>
                {t(`statusLabel.${company.status}`)}
              </StatusBadge>
              {company.origin === "imported" && (
                <Badge tone="imported">{t("imported")}</Badge>
              )}
            </div>
          )}
        </header>
        {company && company.origin !== "imported" && (
          <CompanyTabs active="profile" showVerify={company.role === "owner"} />
        )}
        {company?.origin === "imported" && (
          <Alert title={t("importedReadonly")} />
        )}
        {company &&
          company.status === "unverified" &&
          company.role === "owner" && (
            <Alert tone="warning" title={t("verifyHint")}>
              <Link
                href="/employer/company/verify"
                className="underline underline-offset-4"
              >
                {t("verifyLink")}
              </Link>
            </Alert>
          )}
        {company ? (
          canEdit ? (
            <CompanyForm
              action="edit"
              companyId={company.id}
              initial={company}
              text={formText}
            />
          ) : null
        ) : (
          <CompanyForm action="create" text={formText} />
        )}
        {ownCompany ? (
          <TeamSeats
            companyId={ownCompany.id}
            cap={cap}
            people={people}
            text={{
              heading: t("team.heading"),
              count: t("team.count", { used: people.length, cap }),
              email: t("team.email"),
              add: t("team.add"),
              added: t("team.added"),
              remove: t("team.remove"),
              removed: t("team.removed"),
              full: t("team.full"),
              missing: t("team.missing"),
              already: t("team.already"),
              error: t("team.error"),
              upgrade: t("team.upgrade"),
              atTeamCap: t("team.atTeamCap"),
            }}
          />
        ) : null}
      </Container>
    </main>
  );
}
