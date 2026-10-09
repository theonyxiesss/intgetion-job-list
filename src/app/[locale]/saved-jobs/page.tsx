import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { listSavedJobsForUser } from "@/modules/feedback/service";
import { UnsaveButton } from "@/modules/feedback/ui/unsave-button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { CompanyMarkFor } from "@/components/ui/company-mark";
import { JobCard } from "@/components/ui/job-card";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/paths";
import { intlLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function SavedJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`${localePrefix(locale)}/login`);
  const t = await getTranslations("savedJobs");
  const searches = await getTranslations("savedSearches");
  const entries = await listSavedJobsForUser(user.id);
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={t("title")}
          actions={
            <Link href="/saved-searches" className="t-label underline">
              {searches("manage")}
            </Link>
          }
        />
        {entries.length ? (
          <ul className="grid gap-4">
            {entries.map(({ job, savedAt }) => (
              <li key={job.id}>
                <JobCard
                  href={`/jobs/${job.id}`}
                  title={job.title}
                  transitionName={`job-title-${job.id}`}
                  companyName={job.company.name}
                  companyHref={
                    job.company.slug
                      ? `/companies/${job.company.slug}`
                      : undefined
                  }
                  mark={
                    <CompanyMarkFor
                      company={job.company}
                      className="pointer-events-none"
                    />
                  }
                  stats={[
                    {
                      label: t("savedOn"),
                      value: new Date(savedAt).toLocaleDateString(
                        intlLocale(locale),
                      ),
                    },
                  ]}
                  actions={
                    <UnsaveButton
                      jobId={job.id}
                      label={t("unsave")}
                      error={t("unsaveError")}
                    />
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("empty")} />
        )}
      </Container>
    </main>
  );
}
