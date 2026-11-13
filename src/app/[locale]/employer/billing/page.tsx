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
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";

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

  // v2 (UI_V2): the «My finances» mockup on the real plans and hires.
  if (flags.uiV2Enabled) {
    const card = "rounded-[18px] border border-line bg-surface p-5";
    const companyPlan =
      plan === "team" ? t("team") : plan === "hire" ? t("hire") : t("start");
    const personalPlan =
      personal.candidatePlan === "free"
        ? t("v2.free")
        : t(personal.candidatePlan);
    const showCompany =
      !companyContext.companies.length || Boolean(companyContext.selected);
    const hires = companyBilling?.hires ?? [];
    return (
      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="mr-auto text-[22px] font-semibold tracking-tight">
              {t("v2.title")}
            </h1>
            <Link
              href="/pricing"
              className="flex min-h-10 items-center rounded-xl border border-line-strong px-3.5 text-sm hover:bg-surface"
            >
              {nav("pricing")}
            </Link>
          </header>
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
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <section className={`${card} flex flex-col gap-3`}>
              <span className="text-sm text-fg-muted">
                {t("v2.personalPlan")}
              </span>
              <span className="text-[32px] leading-none font-semibold tracking-tight">
                {personalPlan}
              </span>
              <span className="text-sm text-fg-subtle">
                {personal.candidateUntil
                  ? t("planUntil", {
                      date: personal.candidateUntil.slice(0, 10),
                    })
                  : t("v2.noEnd")}
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/billing/crypto?plan=plus"
                  className="flex min-h-10 items-center rounded-xl bg-fg px-4 text-sm font-semibold text-bg hover:opacity-90"
                >
                  {t("v2.pay")}
                </Link>
              </div>
            </section>
            {showCompany ? (
              <section className={`${card} flex flex-col gap-2`}>
                <span className="text-sm text-fg-muted">
                  {t("v2.companyPlan")}
                </span>
                <span className="text-2xl font-semibold">{companyPlan}</span>
                <span className="text-sm text-fg-subtle">
                  {companyBilling?.teamUntil
                    ? t("teamUntil", {
                        date: companyBilling.teamUntil.slice(0, 10),
                      })
                    : (companyContext.selected?.name ?? "")}
                </span>
              </section>
            ) : null}
            <section className={`${card} flex flex-col gap-2`}>
              <span className="text-sm text-fg-muted">{t("v2.hires")}</span>
              <span className="text-2xl font-semibold">{hires.length}</span>
              <span className="text-sm text-fg-subtle">
                {t("v2.hiresText")}
              </span>
            </section>
          </div>
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className={`${card} flex flex-col gap-2`}>
              <h2 className="text-[15px] font-semibold">
                {t("v2.operations")}
              </h2>
              {hires.length > 0 ? (
                <ul className="flex flex-col">
                  {hires.map((hire) => (
                    <li
                      key={hire.jobId}
                      className="flex items-center gap-3 border-t border-line py-3 first:border-t-0"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg-muted"
                      >
                        ↓
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">{t("hire")}</span>
                        <span className="text-xs text-fg-subtle">
                          {t("hireUntil", {
                            date: hire.validUntil.slice(0, 10),
                          })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-muted">{t("v2.noOperations")}</p>
              )}
            </section>
            <aside className="flex flex-col gap-3">
              <section className={`${card} flex flex-col gap-3`}>
                <h2 className="text-[15px] font-semibold">
                  {t("v2.subscription")}
                </h2>
                <p className="text-sm text-fg-muted">{t("startHint")}</p>
                <Link
                  href="/pricing"
                  className="flex min-h-10 items-center justify-center rounded-xl border border-line-strong text-sm font-medium hover:bg-surface-2"
                >
                  {t("v2.changePlan")}
                </Link>
              </section>
              <section className={`${card} flex flex-col gap-3`}>
                <h2 className="text-[15px] font-semibold">{t("v2.methods")}</h2>
                <p className="text-sm text-fg-muted">{t("v2.methodsText")}</p>
                <Link
                  href="/account#security"
                  className="flex min-h-10 items-center justify-center rounded-xl border border-line-strong text-sm font-medium hover:bg-surface-2"
                >
                  {t("v2.wallet")}
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </main>
    );
  }

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
