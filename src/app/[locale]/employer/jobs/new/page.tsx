import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  ButtonLink,
  Container,
  Icon,
  PageHeader,
  navBack,
} from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { JobForm } from "@/modules/jobs/ui/job-form";
import { jobFormOptions } from "../form-options";
import { localePrefix } from "@/i18n/paths";

export default async function NewEmployerJobPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);
  // No separate company account is needed: the form asks for the company
  // name, and the first posting creates the company (hire-post.ts).
  const companies = (await getCompaniesForUser(user.id)).filter(
    (company) =>
      company.origin === "internal" &&
      ["owner", "admin", "recruiter"].includes(company.role),
  );
  const company = companies[0] ?? null;
  const t = await getTranslations("employerJobs");
  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <ButtonLink
          href="/employer/jobs"
          variant="ghost"
          {...navBack}
          icon={<Icon icon={ArrowLeft} size={16} />}
          className="-ml-5 self-start"
        >
          {t("back")}
        </ButtonLink>
        <PageHeader label={company?.name} title={t("newJob")} />
        <JobForm
          companyId={company?.id ?? null}
          text={t.raw("form")}
          options={await jobFormOptions()}
        />
      </Container>
    </main>
  );
}
