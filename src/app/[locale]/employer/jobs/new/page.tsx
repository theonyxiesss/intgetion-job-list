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

export default async function NewEmployerJobPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);
  const companies = (await getCompaniesForUser(user.id)).filter(
    (company) =>
      company.origin === "internal" &&
      ["owner", "admin", "recruiter"].includes(company.role),
  );
  if (!companies[0]) redirect(`/${locale}/employer/company`);
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
        <PageHeader label={companies[0].name} title={t("newJob")} />
        <JobForm
          companyId={companies[0].id}
          text={t.raw("form")}
          options={await jobFormOptions()}
        />
      </Container>
    </main>
  );
}
