import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { JobForm } from "@/modules/jobs/ui/job-form";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t("newJob")}</h1>
      <JobForm companyId={companies[0].id} text={t.raw("form")} />
    </main>
  );
}
