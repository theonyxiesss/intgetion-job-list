import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportDecision } from "@/components/admin/admin-actions";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { Link } from "@/i18n/navigation";
import { listReports, listReportsQuery } from "@/modules/moderation/service";

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
  const query = listReportsQuery.safeParse(await searchParams);
  const { items, nextCursor } = await listReports(
    query.success ? query.data : listReportsQuery.parse({}),
  );

  return (
    <AdminShell title={t("reportsTitle")}>
      <p className="text-sm opacity-80">{t("reportsNote")}</p>
      {items.length === 0 ? (
        <p>{t("reportsEmpty")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th scope="col">{t("colTime")}</th>
              <th scope="col">{t("colEntity")}</th>
              <th scope="col">{t("colReason")}</th>
              <th scope="col">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((report) => (
              <tr key={report.id} className="border-t border-current/15">
                <td className="py-2">
                  {report.createdAt.slice(0, 16).replace("T", " ")}
                </td>
                <td>
                  <span className="block text-xs opacity-80">
                    {report.entityType}
                  </span>
                  {report.jobTitle ?? report.companyName ?? report.entityId}
                  {report.jobTitle && report.companyName && (
                    <span className="block text-xs opacity-80">
                      {report.companyName}
                    </span>
                  )}
                </td>
                <td>
                  {report.reason}
                  {report.details && (
                    <span className="block text-xs opacity-80">
                      {report.details}
                    </span>
                  )}
                </td>
                <td>
                  <ReportDecision reportId={report.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {nextCursor && (
        <Link
          href={{ pathname: "/admin/reports", query: { cursor: nextCursor } }}
          className="underline"
        >
          {t("nextPage")}
        </Link>
      )}
    </AdminShell>
  );
}
