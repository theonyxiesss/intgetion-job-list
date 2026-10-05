import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportDecision } from "@/components/admin/admin-actions";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import {
  Badge,
  EmptyState,
  LinkTabs,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { listReports, listReportsQuery } from "@/modules/moderation/service";

const statuses = ["open", "confirmed", "dismissed"] as const;

export default async function AdminReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const parsed = listReportsQuery.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : listReportsQuery.parse({});
  const { items, nextCursor } = await listReports(query);

  return (
    <AdminShell
      title={t("reportsTitle")}
      active="reports"
      intro={t("reportsNote")}
    >
      <div className="min-w-0 max-w-full">
        <LinkTabs
          label={t("reportsTitle")}
          items={statuses.map((status) => ({
            label: t(`reportStatus.${status}`),
            href: { pathname: "/admin/reports", query: { status } },
            active: query.status === status,
          }))}
        />
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("reportsEmpty")} />
      ) : (
        <Table className="min-w-0" caption={t("reportsTitle")}>
          <thead>
            <tr>
              <Th>{t("colTime")}</Th>
              <Th>{t("colEntity")}</Th>
              <Th>{t("colReason")}</Th>
              <Th>
                {query.status === "open" ? t("colActions") : t("colStatus")}
              </Th>
            </tr>
          </thead>
          <tbody>
            {items.map((report) => (
              <Tr key={report.id}>
                <Td mono className="whitespace-nowrap">
                  {report.createdAt.slice(0, 16).replace("T", " ")}
                </Td>
                <Td>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge>{report.entityType}</Badge>
                    <span className="font-medium">
                      {report.jobTitle ?? report.companyName ?? report.entityId}
                    </span>
                  </span>
                  {report.jobTitle && report.companyName && (
                    <span className="t-caption block text-fg-muted">
                      {report.companyName}
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="t-data">{report.reason}</span>
                  {report.details && (
                    <span className="t-caption block max-w-[40ch] text-fg-muted">
                      {report.details}
                    </span>
                  )}
                </Td>
                <Td>
                  {report.status === "open" ? (
                    <ReportDecision reportId={report.id} />
                  ) : (
                    <StatusBadge status={report.status}>
                      {t(`reportStatus.${report.status}`)}
                    </StatusBadge>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {nextCursor && (
        <NextPageLink
          href={{
            pathname: "/admin/reports",
            query: { status: query.status, cursor: nextCursor },
          }}
        />
      )}
    </AdminShell>
  );
}
