import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { findOwnedJob } from "@/modules/jobs/service";
import { JobForm } from "@/modules/jobs/ui/job-form";
import { ArrowLeft } from "lucide-react";
import {
  ButtonLink,
  Container,
  Icon,
  PageHeader,
  navBack,
} from "@/components/ui";
import { jobFormOptions } from "../../form-options";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export default async function EditEmployerJobPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);
  let job;
  try {
    job = await findOwnedJob(id, user.id);
  } catch {
    notFound();
  }
  if (
    !["draft", "paused", "pending_moderation", "published"].includes(job.status)
  )
    notFound();
  const t = await getTranslations("employerJobs");
  return (
    <main className="flex-1 py-10">
      <Container className="flex flex-col gap-8">
        <ButtonLink
          href={`/employer/jobs/${id}`}
          variant="ghost"
          {...navBack}
          icon={<Icon icon={ArrowLeft} size={16} />}
          className="-ml-5 self-start"
        >
          {t("back")}
        </ButtonLink>
        <PageHeader label={job.title} title={t("edit")} />
        <JobForm
          companyId={job.companyId}
          initial={toJobDto(job)}
          text={t.raw("form")}
          options={await jobFormOptions()}
        />
      </Container>
    </main>
  );
}
