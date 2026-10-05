import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import {
  Alert,
  EmptyState,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { listImportRuns, listImportSources } from "@/modules/ingestion/service";

const time = (date: Date | null) =>
  date ? date.toISOString().slice(0, 16).replace("T", " ") : "—";

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
    <AdminShell title={t("importTitle")} active="import">
      <Alert title={t("importNote")} />
      <section className="flex flex-col gap-4" aria-labelledby="import-sources">
        <h2 id="import-sources" className="t-h3">
          {t("importSources")}
        </h2>
        {sources.length === 0 ? (
          <EmptyState title={t("importEmpty")} />
        ) : (
          <Table className="min-w-0" caption={t("importSources")}>
            <thead>
              <tr>
                <Th>{t("colSource")}</Th>
                <Th>{t("colKind")}</Th>
                <Th>{t("colLastRun")}</Th>
                <Th>{t("colStatus")}</Th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <Tr key={source.id}>
                  <Td className="font-medium">{source.name}</Td>
                  <Td mono>{source.kind}</Td>
                  <Td mono>{time(source.lastRunAt)}</Td>
                  <Td>
                    {source.lastStatus ? (
                      <StatusBadge
                        status={
                          source.lastStatus === "success"
                            ? "confirmed"
                            : "failed"
                        }
                      >
                        {source.lastStatus}
                      </StatusBadge>
                    ) : (
                      "—"
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="import-runs">
        <h2 id="import-runs" className="t-h3">
          {t("importRuns")}
        </h2>
        {runs.length === 0 ? (
          <EmptyState title={t("importEmpty")} />
        ) : (
          <Table className="min-w-0" caption={t("importRuns")}>
            <thead>
              <tr>
                <Th>{t("colTime")}</Th>
                <Th>{t("colSource")}</Th>
                <Th numeric>{t("runFetched")}</Th>
                <Th numeric>{t("runCreated")}</Th>
                <Th numeric>{t("runUpdated")}</Th>
                <Th numeric>{t("runMerged")}</Th>
                <Th numeric>{t("runRejected")}</Th>
                <Th numeric>{t("runExpired")}</Th>
                <Th>{t("colError")}</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <Tr key={run.id}>
                  <Td mono className="whitespace-nowrap">
                    {time(run.startedAt)}
                  </Td>
                  <Td>{run.source}</Td>
                  <Td numeric>{run.fetched}</Td>
                  <Td numeric>{run.created}</Td>
                  <Td numeric>{run.updated}</Td>
                  <Td numeric>{run.merged}</Td>
                  <Td numeric>{run.rejected}</Td>
                  <Td numeric>{run.expired}</Td>
                  <Td className={run.error ? "text-danger" : "text-fg-subtle"}>
                    {run.error ?? "—"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </AdminShell>
  );
}
