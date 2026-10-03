import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { findOwnedJob } from "@/modules/jobs/service";
import { JobForm } from "@/modules/jobs/ui/job-form";

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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t("edit")}</h1>
      <JobForm
        companyId={job.companyId}
        initial={toJobDto(job)}
        text={t.raw("form")}
      />
    </main>
  );
}
