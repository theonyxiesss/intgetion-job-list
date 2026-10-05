import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import {
  ButtonLink,
  Container,
  EmptyState,
  Icon,
  Stat,
  StatRow,
  Table,
  Td,
  Th,
  Tr,
  navBack,
} from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jobViews } from "@/modules/analytics/service";
import { countByStatusForJob } from "@/modules/applications/service";
import { getCurrentUser } from "@/modules/auth/service";
import { findOwnedJob } from "@/modules/jobs/service";
import { EmployerJobTabs } from "../job-tabs";

const DAYS = 30;
const STATUSES = [
  "applied",
  "viewed",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

/** A bar without inline styles (CSP): a native progress element. */
function Bar({ value, max }: { value: number; max: number }) {
  return (
    <progress
      value={value}
      max={Math.max(max, 1)}
      aria-hidden="true"
      className="h-2 w-full min-w-24 appearance-none overflow-hidden bg-line [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-line [&::-webkit-progress-value]:bg-accent"
    />
  );
}

/** Views, sources and applications of one job for its company (D232). */
export default async function EmployerJobStatsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) redirect(`/${locale}/login`);
  try {
    await findOwnedJob(id, user.id);
  } catch {
    notFound();
  }
  const t = await getTranslations("employerJobs");
  const statusNames = await getTranslations("employerApplications.status");
  const [views, byStatus] = await Promise.all([
    jobViews(id, DAYS),
    countByStatusForJob(id),
  ]);
  const applications = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const conversion = views.visitors
    ? `${Math.round((Math.min(applications, views.visitors) / views.visitors) * 100)}%`
    : "—";
  const maxDaily = Math.max(0, ...views.daily.map((row) => row.views));
  const maxSource = Math.max(0, ...views.sources.map((row) => row.count));

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
        <EmployerJobTabs jobId={id} active="stats" />
        <div className="flex flex-col gap-1">
          <h1 className="t-h2">{t("stats.title", { days: DAYS })}</h1>
          <p className="t-body-s max-w-[70ch] text-fg-muted">
            {t("stats.note")}
          </p>
        </div>
        <StatRow>
          <Stat label={t("stats.views")} value={views.views} />
          <Stat label={t("stats.visitors")} value={views.visitors} />
          <Stat label={t("stats.applications")} value={applications} />
          <Stat label={t("stats.conversion")} value={conversion} />
        </StatRow>

        {views.views === 0 ? (
          <EmptyState title={t("stats.empty")} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="flex flex-col gap-2">
              <h2 className="t-h3">{t("stats.daily")}</h2>
              <Table>
                <thead>
                  <Tr>
                    <Th>{t("stats.day")}</Th>
                    <Th className="text-right">{t("stats.count")}</Th>
                    <Th className="w-1/2">
                      <span className="sr-only">{t("stats.count")}</span>
                    </Th>
                  </Tr>
                </thead>
                <tbody>
                  {views.daily.map((row) => (
                    <Tr key={row.day}>
                      <Td className="t-data">{row.day}</Td>
                      <Td className="t-data text-right">{row.views}</Td>
                      <Td>
                        <Bar value={row.views} max={maxDaily} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </section>
            <section className="flex flex-col gap-2">
              <h2 className="t-h3">{t("stats.sources")}</h2>
              <Table>
                <thead>
                  <Tr>
                    <Th>{t("stats.source")}</Th>
                    <Th className="text-right">{t("stats.count")}</Th>
                    <Th className="w-1/2">
                      <span className="sr-only">{t("stats.count")}</span>
                    </Th>
                  </Tr>
                </thead>
                <tbody>
                  {views.sources.map((row) => (
                    <Tr key={row.label ?? ""}>
                      <Td>
                        {row.label === "direct" ? t("stats.direct") : row.label}
                      </Td>
                      <Td className="t-data text-right">{row.count}</Td>
                      <Td>
                        <Bar value={row.count} max={maxSource} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <h2 className="t-h3 pt-4">{t("stats.devices")}</h2>
              <Table>
                <tbody>
                  {views.devices.map((row) => (
                    <Tr key={row.label ?? ""}>
                      <Td>
                        {row.label
                          ? t(
                              `stats.deviceNames.${row.label as "mobile" | "tablet" | "desktop"}`,
                            )
                          : ""}
                      </Td>
                      <Td className="t-data text-right">{row.count}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </section>
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="t-h3">{t("stats.pipeline")}</h2>
          <Table>
            <thead>
              <Tr>
                <Th>{t("stats.status")}</Th>
                <Th className="text-right">{t("stats.applications")}</Th>
              </Tr>
            </thead>
            <tbody>
              {STATUSES.map((status) => (
                <Tr key={status}>
                  <Td>{statusNames(status)}</Td>
                  <Td className="t-data text-right">{byStatus[status] ?? 0}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      </Container>
    </main>
  );
}
