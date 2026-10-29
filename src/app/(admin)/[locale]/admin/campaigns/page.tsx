import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { requireAdminPage } from "@/components/admin/admin-page";
import { Link } from "@/i18n/navigation";
import { formatMinor } from "@/lib/money";
import { BILLING_CHAINS } from "@/lib/billing/chains";
import {
  listDisputeQueue,
  listEscalatedReviews,
  listRefundsDue,
  listReviewQueue,
  listRoomReportQueue,
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
  const escalated = await listEscalatedReviews(true);
  const roomReports = await listRoomReportQueue(true);
  const disputes = await listDisputeQueue(true);
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
                {row.disputeOpen ? (
                  <p role="status" className="t-body-s font-medium">
                    {t("adminPayoutDispute")}
                  </p>
                ) : !row.fromWallet ? (
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
        <h2 className="font-medium">{t("adminEscalationsTitle")}</h2>
        {escalated.length === 0 ? (
          <p className="text-fg-muted">{t("adminEscalationsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {escalated.map((row) => (
              <li
                key={row.submissionId}
                className="rounded-lg border border-line p-4"
              >
                <p className="font-medium">{row.productName}</p>
                <p className="t-body-s font-mono">
                  {t("adminEscalationLine", {
                    date: row.dueAt.slice(0, 10),
                  })}
                </p>
                <Link
                  href={`/campaigns/${row.campaignId}/room/${row.inviteId}`}
                  className="t-body-s underline underline-offset-4"
                >
                  {t("roomOpen")}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <h2 className="font-medium">{t("adminDisputesTitle")}</h2>
        {disputes.length === 0 ? (
          <p className="text-fg-muted">{t("adminDisputesEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {disputes.map((row) => (
              <li key={row.id} className="rounded-lg border border-line p-4">
                <p className="font-medium">{row.productName}</p>
                <p className="t-body-s text-fg-muted">
                  {t(`disputeWho.${row.side}`)} ·{" "}
                  {t(`disputeReason.${row.reason}`)} ·{" "}
                  {t(`disputeStatus.${row.status}`)}
                </p>
                {row.note ? (
                  <p className="break-words whitespace-pre-wrap">{row.note}</p>
                ) : null}
                <Link
                  href={`/campaigns/${row.campaignId}/room/${row.inviteId}`}
                  className="t-body-s underline underline-offset-4"
                >
                  {t("roomOpen")}
                </Link>
                <div className="mt-3 flex flex-wrap gap-3">
                  {row.status === "open" ? (
                    <UgcAction
                      action="disputeDecide"
                      label={t("adminDisputeTake")}
                      body={{ disputeId: row.id, to: "in_review" }}
                      primary
                    />
                  ) : null}
                  {(["company", "creator", "agreed", "dismissed"] as const).map(
                    (outcome) => (
                      <UgcAction
                        key={outcome}
                        action="disputeDecide"
                        label={t("adminDisputeClose", {
                          outcome: t(`disputeOutcome.${outcome}`),
                        })}
                        body={{
                          disputeId: row.id,
                          to: "resolved",
                          outcome,
                        }}
                      />
                    ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <h2 className="font-medium">{t("adminRoomReportsTitle")}</h2>
        {roomReports.length === 0 ? (
          <p className="text-fg-muted">{t("adminRoomReportsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {roomReports.map((row) => (
              <li key={row.id} className="rounded-lg border border-line p-4">
                <p className="t-body-s text-fg-muted">
                  {row.productName} · {t(`reportReason.${row.reason}`)}
                </p>
                <p className="break-words whitespace-pre-wrap">{row.body}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <UgcAction
                    action="roomReportDecide"
                    label={t("adminHideMessage")}
                    body={{ reportId: row.id, to: "hidden" }}
                    primary
                  />
                  <UgcAction
                    action="roomReportDecide"
                    label={t("adminDismissReport")}
                    body={{ reportId: row.id, to: "dismissed" }}
                  />
                </div>
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
