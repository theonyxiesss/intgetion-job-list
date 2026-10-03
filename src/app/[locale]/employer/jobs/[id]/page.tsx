import { ArrowLeft, Pencil } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import {
  ButtonLink,
  Container,
  Icon,
  Stat,
  StatRow,
  StatusBadge,
  navBack,
} from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { findOwnedJob } from "@/modules/jobs/service";
import { JobActions } from "@/modules/jobs/ui/job-actions";
import { EmployerJobTabs } from "./job-tabs";

const date = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : "—";

export default async function EmployerJobPage({
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
  const dto = toJobDto(job);
  const t = await getTranslations("employerJobs");
  const labels = await getTranslations("jobs");
  const categories = await getTranslations("categories");
  const editable = ["draft", "pending_moderation", "published", "paused"];

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
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <StatusBadge status={job.status}>
              {t(`statusLabel.${job.status}`)}
            </StatusBadge>
            <h1 className="t-display-l">{dto.title}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {editable.includes(job.status) && (
              <ButtonLink
                href={`/employer/jobs/${id}/edit`}
                variant="secondary"
                icon={<Icon icon={Pencil} size={16} />}
              >
                {t("edit")}
              </ButtonLink>
            )}
            <JobActions
              jobId={job.id}
              status={job.status}
              text={t.raw("actions")}
            />
          </div>
        </header>
        <EmployerJobTabs jobId={id} active="job" />
        <StatRow>
          <Stat label={t("form.category")} value={categories(dto.category)} />
          <Stat label={t("form.workFormat")} value={labels(dto.workFormat)} />
          <Stat
            label={t("form.employmentType")}
            value={labels(dto.employmentType)}
          />
          <Stat label={t("colPublished")} value={date(job.publishedAt)} />
          <Stat label={t("colExpires")} value={date(job.expiresAt)} />
        </StatRow>
        <div className="t-body-l max-w-[68ch] whitespace-pre-wrap">
          {dto.description}
        </div>
      </Container>
    </main>
  );
}
