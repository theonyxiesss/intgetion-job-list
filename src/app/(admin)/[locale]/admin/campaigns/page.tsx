import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { requireAdminPage } from "@/components/admin/admin-page";
import { formatMinor } from "@/lib/money";
import { BILLING_CHAINS } from "@/lib/billing/chains";
import {
  listRefundsDue,
  listReviewQueue,
  listWalletPayouts,
} from "@/modules/ugc/service";
import { UgcAction } from "@/modules/ugc/ui/action";
import { UgcTxForm } from "@/modules/ugc/ui/tx-form";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("ugc");
  const rows = await listReviewQueue(true);
  const owed = await listWalletPayouts(true);
  const refunds = await listRefundsDue(true);
  const h = await getTranslations("ugcHub");
  const chains = BILLING_CHAINS.map((chain) => chain.id);
  const usd = (minor: string) =>
    formatMinor(BigInt(minor), "USD", locale, { wholeWhenEven: true });
  const labels = (submit: string) => ({
    chain: h("admin.chain"),
    token: h("admin.token"),
    txHash: h("admin.txHash"),
    submit,
    error: h.raw("admin.txError") as string,
  });
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-6">
        <PageHeader title={t("adminTitle")} />
        {rows.length === 0 ? (
          <p className="text-fg-muted">{t("adminEmpty")}</p>
        ) : null}
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-line p-4">
              <p className="font-medium">{row.productName}</p>
              <p className="t-body-s mt-1 max-w-[60ch]">{row.productSummary}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <UgcAction
                  action="moderate"
                  label={t("approve")}
                  body={{ campaignId: row.id, to: "open" }}
                  primary
                />
                <UgcAction
                  action="moderate"
                  label={t("reject")}
                  body={{ campaignId: row.id, to: "rejected" }}
                />
              </div>
            </li>
          ))}
        </ul>
        <h2 className="font-medium">{t("payoutsTitle")}</h2>
        {owed.length === 0 ? (
          <p className="text-fg-muted">{t("payoutsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {owed.map((row) => (
              <li key={row.id} className="rounded-lg border border-line p-4">
                <p className="font-medium">{row.productName}</p>
                <p className="t-body-s">{row.displayName || t("creator")}</p>
                <p className="t-body-s mt-2">
                  {t("owedNote", { amount: usd(row.amountMinor) })}
                </p>
                {!row.fromWallet ? (
                  <>
                    <p className="t-body-s text-fg-muted">
                      {h("admin.payoutManual")}
                    </p>
                    <UgcAction
                      action="markPaid"
                      label={t("markPaid")}
                      body={{ payoutId: row.id }}
                      primary
                    />
                  </>
                ) : row.payoutAddress ? (
                  <>
                    <p className="t-body-s font-mono break-all">
                      {h("admin.payoutWallet", { address: row.payoutAddress })}
                    </p>
                    <UgcTxForm
                      action="payoutTx"
                      body={{ payoutId: row.id }}
                      chains={chains}
                      labels={labels(h("admin.savePayout"))}
                    />
                  </>
                ) : (
                  <p className="t-body-s text-fg-muted">
                    {h("admin.payoutNoAddress")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <h2 className="font-medium">{h("admin.refundsTitle")}</h2>
        {refunds.length === 0 ? (
          <p className="text-fg-muted">{h("admin.refundsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {refunds.map((row) => (
              <li
                key={row.campaignId}
                className="rounded-lg border border-line p-4"
              >
                <p className="t-body-s font-mono break-all">
                  {h("admin.refundLine", {
                    product: row.productName,
                    amount: usd(row.amountMinor),
                    address: row.recipient,
                  })}
                </p>
                {row.waiting ? (
                  <p className="t-body-s text-fg-muted">
                    {h("admin.refundWaiting")}
                  </p>
                ) : (
                  <UgcTxForm
                    action="refundTx"
                    body={{ campaignId: row.campaignId }}
                    chains={chains}
                    labels={labels(h("admin.saveRefund"))}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
