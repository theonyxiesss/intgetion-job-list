import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { findOwnedJob } from "@/modules/jobs/service";
import { JobActions } from "@/modules/jobs/ui/job-actions";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
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
  const pipeline = await getTranslations("employerApplications");
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-12">
      <Link className="underline" href={`/${locale}/employer/jobs`}>
        {t("back")}
      </Link>
      <h1 className="text-3xl font-semibold">{dto.title}</h1>
      <p>
        {t("status")}: {dto.status}
      </p>
      <p>{dto.description}</p>
      <JobActions jobId={job.id} status={job.status} text={t.raw("actions")} />
      <Link
        className="w-fit underline"
        href={`/${locale}/employer/jobs/${id}/applications`}
      >
        {pipeline("open")}
      </Link>
      <Link
        className="w-fit rounded-md border border-line-strong px-4 py-2"
        href={`/${locale}/employer/jobs/${id}/edit`}
      >
        {t("edit")}
      </Link>
    </main>
  );
}
