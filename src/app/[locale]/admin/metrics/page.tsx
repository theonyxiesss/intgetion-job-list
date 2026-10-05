import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminPage } from "@/components/admin/admin-page";
import { analyticsReport } from "@/modules/analytics/service";
import { AnalyticsReportView } from "@/modules/analytics/ui/analytics-report";
import { envStatus, getMetrics } from "@/modules/metrics/service";
import { EnvStatusView } from "@/modules/metrics/ui/env-status";

const ANALYTICS_DAYS = 30;
import { Table, Th, Tr, Td, Stat } from "@/components/ui";

export const metadata: Metadata = {
  title: "Admin Metrics",
};

export default async function AdminMetricsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Anyone but an admin gets 404, like the other /admin pages.
  await requireAdminPage();
  const t = await getTranslations("metrics");
  const [data, report] = await Promise.all([
    getMetrics(),
    analyticsReport(ANALYTICS_DAYS),
  ]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="t-h2">{t("title")}</h1>
      <p className="t-body text-fg-muted">{t("description")}</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("registrations.total")}
          value={data.registrations.total.toLocaleString()}
        />
        <Stat
          label={t("registrations.last7d")}
          value={data.registrations.last7d.toLocaleString()}
        />
        <Stat
          label={t("jobs.published")}
          value={data.jobs.published.toLocaleString()}
        />
        <Stat
          label={t("jobs.internal")}
          value={data.jobs.internal.toLocaleString()}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("jobs.imported")}
          value={data.jobs.imported.toLocaleString()}
        />
        <Stat
          label={t("applications.last24h")}
          value={data.applications.last24h.toLocaleString()}
        />
        <Stat
          label={t("applications.last7d")}
          value={data.applications.last7d.toLocaleString()}
        />
        <Stat
          label={t("applications.mutualInterest")}
          value={data.applications.mutualInterest.toLocaleString()}
        />
      </div>

      {data.matching && (
        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            label={t("matching.avgScore")}
            value={
              data.matching.avgScore !== null
                ? (data.matching.avgScore * 100).toFixed(1) + "%"
                : "—"
            }
          />
          <Stat
            label={t("matching.totalPairs")}
            value={data.matching.totalPairs.toLocaleString()}
          />
          <Stat
            label={t("matching.thresholdPairs")}
            value={data.matching.thresholdPairs.toLocaleString()}
          />
        </div>
      )}

      <section className="space-y-4">
        <h2 className="t-h3">{t("moderation.title")}</h2>
        <Table>
          <thead>
            <Tr>
              <Th>{t("moderation.status")}</Th>
              <Th className="text-right">{t("moderation.count")}</Th>
            </Tr>
          </thead>
          <tbody>
            <Tr>
              <Td>{t("moderation.pending")}</Td>
              <Td className="text-right">{data.moderation.byStatus.pending}</Td>
            </Tr>
            <Tr>
              <Td>{t("moderation.approved")}</Td>
              <Td className="text-right">
                {data.moderation.byStatus.approved}
              </Td>
            </Tr>
            <Tr>
              <Td>{t("moderation.rejected")}</Td>
              <Td className="text-right">
                {data.moderation.byStatus.rejected}
              </Td>
            </Tr>
            <Tr>
              <Td className="font-medium">{t("moderation.total")}</Td>
              <Td className="text-right font-medium">
                {data.moderation.queueSize}
              </Td>
            </Tr>
          </tbody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="t-h3">{t("emails.title")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Table>
            <thead>
              <Tr>
                <Th>{t("emails.status")}</Th>
                <Th className="text-right">{t("emails.count")}</Th>
              </Tr>
            </thead>
            <tbody>
              <Tr>
                <Td>{t("emails.pending")}</Td>
                <Td className="text-right">{data.emails.byStatus.pending}</Td>
              </Tr>
              <Tr>
                <Td>{t("emails.sent")}</Td>
                <Td className="text-right">{data.emails.byStatus.sent}</Td>
              </Tr>
              <Tr>
                <Td>{t("emails.skipped")}</Td>
                <Td className="text-right">{data.emails.byStatus.skipped}</Td>
              </Tr>
              <Tr>
                <Td>{t("emails.failed")}</Td>
                <Td className="text-right">{data.emails.byStatus.failed}</Td>
              </Tr>
            </tbody>
          </Table>

          <Table>
            <thead>
              <Tr>
                <Th>{t("emails.type")}</Th>
                <Th className="text-right">{t("emails.count")}</Th>
              </Tr>
            </thead>
            <tbody>
              {Object.entries(data.emails.byType).map(([type, count]) => (
                <Tr key={type}>
                  <Td>{type}</Td>
                  <Td className="text-right">{count}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>
      <AnalyticsReportView report={report} days={ANALYTICS_DAYS} />
      <EnvStatusView checks={envStatus()} />
    </div>
  );
}
