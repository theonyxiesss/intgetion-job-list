import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { requireAdminPage } from "@/components/admin/admin-page";
import { Link } from "@/i18n/navigation";
import { formatMinor } from "@/lib/money";
import { listMoneyLedger, type LedgerView } from "@/modules/ugc/service";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "deposit",
  "accrued",
  "paid",
  "owed",
  "refund",
  "rest",
] as const;

type Column = (typeof COLUMNS)[number];

function amountOf(
  row: Pick<LedgerView, `${Column}Minor`>,
  column: Column,
): string {
  return row[`${column}Minor`];
}

/**
 * Money reconciliation for support (U7, TZ 48 §8): for every brief with a
 * paid-in budget, paid in = rewards recorded + returned + rest. Reads only.
 */
export default async function AdminUgcLedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("ugc");
  const { rows, totals } = await listMoneyLedger(true);
  const usd = (minor: string) => formatMinor(BigInt(minor), "USD", locale);
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-6">
        <PageHeader title={t("ledgerTitle")} />
        <p className="t-body-s max-w-[70ch] text-fg-muted">{t("ledgerNote")}</p>
        <Link
          href="/admin/campaigns"
          className="t-body-s self-start underline underline-offset-4"
        >
          {t("ledgerBack")}
        </Link>
        {rows.length === 0 ? (
          <p className="text-fg-muted">{t("ledgerEmpty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="t-body-s w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="p-3 font-medium">
                    {t("ledgerCol.brief")}
                  </th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="p-3 text-right font-medium"
                    >
                      {t(`ledgerCol.${column}`)}
                    </th>
                  ))}
                  <th scope="col" className="p-3 font-medium">
                    {t("ledgerCol.state")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.campaignId} className="border-b border-line">
                    <th scope="row" className="p-3 text-left font-normal">
                      {row.productName}
                    </th>
                    {COLUMNS.map((column) => (
                      <td key={column} className="p-3 text-right font-mono">
                        {usd(amountOf(row, column))}
                      </td>
                    ))}
                    <td
                      className={
                        row.state === "over"
                          ? "p-3 font-medium text-danger"
                          : row.state === "settled" || row.state === "running"
                            ? "p-3 text-fg-muted"
                            : "p-3 font-medium"
                      }
                    >
                      {t(`ledgerState.${row.state}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="p-3 text-left font-medium">
                    {t("ledgerTotal")}
                  </th>
                  {COLUMNS.map((column) => (
                    <td
                      key={column}
                      className="p-3 text-right font-mono font-medium"
                    >
                      {usd(amountOf(totals, column))}
                    </td>
                  ))}
                  <td className="p-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Container>
    </main>
  );
}
