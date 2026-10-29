import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  ButtonLink,
  Container,
  EmptyState,
  Icon,
  PageHeader,
  navBack,
} from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  getCompaniesForUser,
  resolveEmployerCompany,
} from "@/modules/companies/service";
import { EmployerCompanySwitcher } from "@/modules/companies/ui/employer-company-switcher";
import { JobForm } from "@/modules/jobs/ui/job-form";
import { jobFormOptions } from "../form-options";
import { localePrefix } from "@/i18n/paths";

export default async function NewEmployerJobPage({
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
  const companies = (await getCompaniesForUser(user.id)).filter(
    (company) =>
      company.origin === "internal" &&
      ["owner", "admin", "recruiter"].includes(company.role),
  );
  if (!companies[0]) redirect(`${localePrefix(locale)}/employer/company`);
  const query = await searchParams;
  const context = resolveEmployerCompany(
    companies,
    typeof query.companyId === "string" ? query.companyId : undefined,
  );
  const t = await getTranslations("employerJobs");
  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <ButtonLink
          href={
            context.selected
              ? `/employer/jobs?companyId=${context.selected.id}`
              : "/employer/jobs"
          }
          variant="ghost"
          {...navBack}
          icon={<Icon icon={ArrowLeft} size={16} />}
          className="-ml-5 self-start"
        >
          {t("back")}
        </ButtonLink>
        <PageHeader label={context.selected?.name} title={t("newJob")} />
        <EmployerCompanySwitcher
          companies={context.companies}
          selectedCompanyId={context.selected?.id ?? null}
          pathname="/employer/jobs/new"
          label={t("companySwitcher")}
        />
        {context.companies.length > 1 && !context.selected ? (
          <EmptyState
            title={t("selectCompanyTitle")}
            text={t("selectCompanyText")}
          />
        ) : context.selected ? (
          <JobForm
            companyId={context.selected.id}
            text={t.raw("form")}
            options={await jobFormOptions()}
          />
        ) : null}
      </Container>
    </main>
  );
}
