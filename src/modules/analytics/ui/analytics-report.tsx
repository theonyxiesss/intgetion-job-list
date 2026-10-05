import { getTranslations } from "next-intl/server";
import { Stat, Table, Td, Th, Tr } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { AnalyticsReport } from "../service";

/** A bar without inline styles (CSP): a native progress element. */
function Bar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <progress
      value={value}
      max={Math.max(max, 1)}
      aria-label={label}
      className="h-2 w-full min-w-24 appearance-none overflow-hidden bg-line [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-line [&::-webkit-progress-value]:bg-accent"
    />
  );
}

function TopTable({
  title,
  head,
  rows,
}: {
  title: string;
  head: [string, string];
  rows: { key: string; label: React.ReactNode; count: number }[];
}) {
  const max = Math.max(0, ...rows.map((row) => row.count));
  return (
    <section className="flex flex-col gap-2">
      <h3 className="t-h3">{title}</h3>
      <Table>
        <thead>
          <Tr>
            <Th>{head[0]}</Th>
            <Th className="text-right">{head[1]}</Th>
            <Th className="w-1/3">
              <span className="sr-only">{head[1]}</span>
            </Th>
          </Tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.key}>
              <Td className="max-w-[40ch] truncate">{row.label}</Td>
              <Td className="t-data text-right">{row.count}</Td>
              <Td>
                <Bar value={row.count} max={max} label={String(row.count)} />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}

/** Own analytics for the admin (D227): last `days` days. */
export async function AnalyticsReportView({
  report,
  days,
}: {
  report: AnalyticsReport;
  days: number;
}) {
  const t = await getTranslations("metrics.analytics");
  const { totals, funnel, crossVisit } = report;
  const maxDaily = Math.max(0, ...report.daily.map((row) => row.visitors));
  const steps = ["page_view", "search", "job_view", "signup", "apply"] as const;
  const stepMax = Math.max(1, funnel.page_view ?? 0);
  return (
    <section
      aria-labelledby="analytics-title"
      className="flex flex-col gap-6 border-t border-line pt-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="analytics-title" className="t-h2">
          {t("title", { days })}
        </h2>
        <p className="t-body-s max-w-[70ch] text-fg-muted">{t("note")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("visitors")} value={totals.visitors.toLocaleString()} />
        <Stat label={t("views")} value={totals.views.toLocaleString()} />
        <Stat
          label={t("consented")}
          value={totals.consented.toLocaleString()}
        />
        <Stat
          label={t("returning")}
          value={totals.returning.toLocaleString()}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="t-h3">{t("funnel")}</h3>
        <Table>
          <thead>
            <Tr>
              <Th>{t("step")}</Th>
              <Th className="text-right">{t("sameDay")}</Th>
              <Th className="text-right">{t("acrossVisits")}</Th>
              <Th className="w-1/3">
                <span className="sr-only">{t("sameDay")}</span>
              </Th>
            </Tr>
          </thead>
          <tbody>
            {steps.map((step) => (
              <Tr key={step}>
                <Td>{t(`steps.${step}`)}</Td>
                <Td className="t-data text-right">{funnel[step] ?? 0}</Td>
                <Td className="t-data text-right">{crossVisit[step] ?? 0}</Td>
                <Td>
                  <Bar
                    value={funnel[step] ?? 0}
                    max={stepMax}
                    label={String(funnel[step] ?? 0)}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="t-h3">{t("daily")}</h3>
        <Table>
          <thead>
            <Tr>
              <Th>{t("day")}</Th>
              <Th className="text-right">{t("visitors")}</Th>
              <Th className="text-right">{t("views")}</Th>
              <Th className="w-1/3">
                <span className="sr-only">{t("visitors")}</span>
              </Th>
            </Tr>
          </thead>
          <tbody>
            {report.daily.map((row) => (
              <Tr key={row.day}>
                <Td className="t-data">{row.day}</Td>
                <Td className="t-data text-right">{row.visitors}</Td>
                <Td className="t-data text-right">{row.views}</Td>
                <Td>
                  <Bar
                    value={row.visitors}
                    max={maxDaily}
                    label={String(row.visitors)}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopTable
          title={t("pages")}
          head={[t("page"), t("views")]}
          rows={report.pages.map((row) => ({
            key: row.label ?? "",
            label: row.label,
            count: row.count,
          }))}
        />
        <TopTable
          title={t("searches")}
          head={[t("term"), t("count")]}
          rows={report.searches.map((row) => ({
            key: row.label ?? "",
            label: row.label,
            count: row.count,
          }))}
        />
        <TopTable
          title={t("jobs")}
          head={[t("job"), t("views")]}
          rows={report.jobs.map((row) => ({
            key: row.jobId,
            label: (
              <Link href={`/jobs/${row.jobId}`} className="underline">
                {row.title ?? row.jobId}
              </Link>
            ),
            count: row.count,
          }))}
        />
        <TopTable
          title={t("sources")}
          head={[t("source"), t("visitors")]}
          rows={report.sources.map((row) => ({
            key: row.label ?? "",
            label: row.label === "direct" ? t("direct") : row.label,
            count: row.count,
          }))}
        />
        <TopTable
          title={t("devices")}
          head={[t("device"), t("visitors")]}
          rows={report.devices.map((row) => ({
            key: row.label ?? "",
            label: row.label ? t(`deviceNames.${row.label}`) : "",
            count: row.count,
          }))}
        />
      </div>
    </section>
  );
}
