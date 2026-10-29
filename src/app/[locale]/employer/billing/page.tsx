import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ButtonLink, Container, EmptyState, PageHeader } from "@/components/ui";
import { localePrefix } from "@/i18n/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  getCompaniesForUser,
  resolveEmployerCompany,
} from "@/modules/companies/service";
import { EmployerCompanySwitcher } from "@/modules/companies/ui/employer-company-switcher";
import { billingForCompany, billingMe } from "@/modules/billing/service";

export default async function EmployerBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ companyId?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);
  const query = await searchParams;
  const companyContext = resolveEmployerCompany(
    await getCompaniesForUser(user.id),
    typeof query.companyId === "string" ? query.companyId : undefined,
  );
  const [personal, companyBilling] = await Promise.all([
    billingMe(user.id),
    companyContext.selected
      ? billingForCompany(user.id, companyContext.selected.id)
      : Promise.resolve(null),
  ]);
  const plan = companyBilling?.plan ?? "start";
  const t = await getTranslations("billing");
  const nav = await getTranslations("nav");
  const employer = await getTranslations("employerJobs");

  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <PageHeader label={companyContext.selected?.name} title={t("title")} />
        <EmployerCompanySwitcher
          companies={companyContext.companies}
          selectedCompanyId={companyContext.selected?.id ?? null}
          pathname="/employer/billing"
          label={employer("companySwitcher")}
        />
        {companyContext.companies.length > 1 && !companyContext.selected ? (
          <EmptyState
            title={employer("selectCompanyTitle")}
            text={employer("selectCompanyText")}
          />
        ) : null}
        {!companyContext.companies.length || companyContext.selected ? (
          <section className="flex flex-col gap-2">
            <h2 className="t-h3">
              {plan === "team"
                ? t("team")
                : plan === "hire"
                  ? t("hire")
                  : t("start")}
            </h2>
            {companyBilling?.teamUntil ? (
              <p className="t-data">
                {t("teamUntil", {
                  date: companyBilling.teamUntil.slice(0, 10),
                })}
              </p>
            ) : null}
          </section>
        ) : null}
        {personal.candidatePlan !== "free" ? (
          <section className="flex flex-col gap-2">
            <h2 className="t-h3">{t(personal.candidatePlan)}</h2>
            {personal.candidateUntil ? (
              <p className="t-data">
                {t("planUntil", { date: personal.candidateUntil.slice(0, 10) })}
              </p>
            ) : null}
          </section>
        ) : null}
        {companyBilling && companyBilling.hires.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {companyBilling.hires.map((hire) => (
              <li key={hire.jobId}>
                {t("hireUntil", {
                  date: hire.validUntil.slice(0, 10),
                })}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="max-w-[60ch] text-fg-muted">{t("startHint")}</p>
        <ButtonLink href="/pricing" variant="secondary">
          {nav("pricing")}
        </ButtonLink>
      </Container>
    </main>
  );
}
