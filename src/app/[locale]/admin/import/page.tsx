import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { listImportRuns, listImportSources } from "@/modules/ingestion/service";

export default async function AdminImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const [sources, runs] = await Promise.all([
    listImportSources(),
    listImportRuns(50),
  ]);

  return (
    <AdminShell title={t("importTitle")}>
      <p className="text-sm opacity-80">{t("importNote")}</p>
      <h2 className="text-xl font-semibold">{t("importSources")}</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th scope="col">{t("colSource")}</th>
            <th scope="col">{t("colKind")}</th>
            <th scope="col">{t("colLastRun")}</th>
            <th scope="col">{t("colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id} className="border-t border-current/15">
              <td className="py-2">{source.name}</td>
              <td>{source.kind}</td>
              <td>
                {source.lastRunAt
                  ? source.lastRunAt
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")
                  : "—"}
              </td>
              <td>{source.lastStatus ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="text-xl font-semibold">{t("importRuns")}</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th scope="col">{t("colTime")}</th>
            <th scope="col">{t("colSource")}</th>
            <th scope="col">{t("colCounters")}</th>
            <th scope="col">{t("colError")}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-t border-current/15">
              <td className="py-2">
                {run.startedAt.toISOString().slice(0, 16).replace("T", " ")}
              </td>
              <td>{run.source}</td>
              <td>
                {t("runCounters", {
                  fetched: run.fetched,
                  created: run.created,
                  updated: run.updated,
                  merged: run.merged,
                  rejected: run.rejected,
                  expired: run.expired,
                })}
              </td>
              <td>{run.error ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
