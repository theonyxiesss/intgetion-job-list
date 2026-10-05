import { getTranslations } from "next-intl/server";
import { Stat, StatRow, Table, Td, Th, Tr } from "@/components/ui";
import type { TrafficReport } from "../service";

/**
 * Where visits come from, and whether search is growing (D293). The founder's
 * question is "is SEO working", so search gets its own line and its own list
 * of landing pages.
 */
export async function TrafficReportView({
  report,
  days,
}: {
  report: TrafficReport;
  days: number;
}) {
  const t = await getTranslations("metrics.traffic");
  const total = report.channels.reduce((sum, row) => sum + row.count, 0);
  const search = report.channels.find((row) => row.channel === "search");
  const share =
    total > 0 ? Math.round(((search?.count ?? 0) / total) * 100) : 0;
  const recent = report.daily.slice(-14);

  return (
    <section
      aria-labelledby="traffic-title"
      className="flex flex-col gap-6 border-t border-line pt-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="traffic-title" className="t-h2">
          {t("title", { days })}
        </h2>
        <p className="t-body-s max-w-[70ch] text-fg-muted">{t("note")}</p>
      </div>

      <dl>
        <StatRow>
          {report.channels.map((row) => (
            <Stat
              key={row.channel}
              label={t(`channel.${row.channel}`)}
              value={row.count.toLocaleString()}
              large={row.channel === "search"}
            />
          ))}
          <Stat label={t("searchShare")} value={`${share}%`} />
        </StatRow>
      </dl>

      {report.engines.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="t-h3">{t("engines")}</h3>
          <Table caption={t("engines")}>
            <thead>
              <Tr>
                <Th>{t("engine")}</Th>
                <Th numeric>{t("visitors")}</Th>
              </Tr>
            </thead>
            <tbody>
              {report.engines.map((row) => (
                <Tr key={row.label}>
                  <Td>{row.label}</Td>
                  <Td numeric>{row.count}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      {report.landings.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="t-h3">{t("landings")}</h3>
          <Table caption={t("landings")}>
            <thead>
              <Tr>
                <Th>{t("page")}</Th>
                <Th numeric>{t("visitors")}</Th>
              </Tr>
            </thead>
            <tbody>
              {report.landings.map((row) => (
                <Tr key={row.label}>
                  <Td>{row.label}</Td>
                  <Td numeric>{row.count}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="t-h3">{t("byDay")}</h3>
        <Table caption={t("byDay")}>
          <thead>
            <Tr>
              <Th>{t("day")}</Th>
              <Th numeric>{t("fromSearch")}</Th>
              <Th numeric>{t("allVisitors")}</Th>
            </Tr>
          </thead>
          <tbody>
            {recent.map((row) => (
              <Tr key={row.day}>
                <Td>{row.day}</Td>
                <Td numeric>{row.search}</Td>
                <Td numeric>{row.total}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>
    </section>
  );
}
