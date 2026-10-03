import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { listJobsForUser } from "@/modules/jobs/service";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export default async function EmployerJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("employerJobs");
  const rows = await listJobsForUser(user.id);
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <Link
          className="rounded-md bg-accent px-4 py-2 text-accent-fg"
          href={`/${locale}/employer/jobs/new`}
        >
          {t("newJob")}
        </Link>
      </header>
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map(({ job }) => {
            const dto = toJobDto(job);
            return (
              <li className="rounded-lg border border-line p-4" key={job.id}>
                <Link
                  className="text-lg font-medium underline"
                  href={`/${locale}/employer/jobs/${job.id}`}
                >
                  {dto.title}
                </Link>
                <p>
                  {t("status")}: {dto.status}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{t("empty")}</p>
      )}
    </main>
  );
}
