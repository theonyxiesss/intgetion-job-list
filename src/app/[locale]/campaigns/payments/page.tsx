import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Stat, StatRow } from "@/components/ui/stat";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import {
  moneyTotals,
  usdLabel,
  type WorkspaceCampaign,
} from "@/modules/ugc/service";
import {
  CampaignStatus,
  DeskEmpty,
  DeskSectionBlock,
  DeskShell,
  DeskSkeleton,
  NeedCompany,
} from "@/modules/ugc/ui/desk";
import { requireDeskUser, loadDesk } from "../desk-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugcDesk" });
  return { title: t("nav.payments"), robots: { index: false, follow: false } };
}

type DepositKey =
  "off" | "paid" | "checking" | "awaiting" | "due" | "later" | "closed";

/** The budget line of one brief, from the deposit state the brief page reads (D466). */
function depositKey(campaign: WorkspaceCampaign): DepositKey {
  const state = campaign.deposit;
  if (!state.required) return "off";
  if (state.paid) return "paid";
  if (state.deposit?.status === "checking") return "checking";
  if (state.deposit?.status === "awaiting_payment") return "awaiting";
  if (state.payable) return "due";
  if (campaign.status === "draft" || campaign.status === "pending_review") {
    return "later";
  }
  return "closed";
}

/**
 * Budgets paid in and rewards recorded for accepted videos (D519). Only
 * stored amounts: no forecast. The deposit itself stays at the checkout.
 */
export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireDeskUser(locale);
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <PaymentsBody userId={userId} />
    </Suspense>
  );
}

async function PaymentsBody({ userId }: { userId: string }) {
  const t = await getTranslations("ugc");
  const h = await getTranslations("ugcHub");
  const d = await getTranslations("ugcDesk");
  const desk = await loadDesk(userId);
  const totals = moneyTotals(desk.campaigns);
  const walletOn = desk.campaigns.some((row) => row.deposit.required);
  const rewards = desk.campaigns.flatMap((campaign) =>
    campaign.participants.flatMap((participant) =>
      participant.payout
        ? [{ campaign, participant, payout: participant.payout }]
        : [],
    ),
  );

  const action = (campaign: WorkspaceCampaign) =>
    depositKey(campaign) === "due" || depositKey(campaign) === "awaiting" ? (
      <ButtonLink
        href={`/billing/crypto?ugc=${campaign.id}`}
        variant="strong"
        className="self-start"
      >
        {h("deposit.action", { total: usdLabel(campaign.budgetMinor) })}
      </ButtonLink>
    ) : null;

  return (
    <DeskShell
      active="payments"
      title={d("nav.payments")}
      intro={d("paymentsIntro")}
      counts={desk.counts}
    >
      {desk.companies.length === 0 ? (
        <NeedCompany />
      ) : desk.campaigns.length === 0 ? (
        <DeskEmpty
          title={d("paymentsEmpty")}
          text={t("moneyNote")}
          action={
            <ButtonLink href="/campaigns/new" variant="strong">
              {d("newBrief")}
            </ButtonLink>
          }
        />
      ) : (
        <>
          {walletOn ? null : (
            <Alert title={d("walletOffTitle")}>{d("walletOffText")}</Alert>
          )}
          <StatRow>
            <Stat
              label={d("money.deposited")}
              value={usdLabel(totals.depositedMinor)}
              large
            />
            <Stat
              label={d("money.awaiting")}
              value={usdLabel(totals.awaitingMinor)}
              large
              muted={totals.awaitingMinor === 0}
            />
            <Stat
              label={d("money.owed")}
              value={usdLabel(totals.owedMinor)}
              large
              muted={totals.owedMinor === 0}
            />
            <Stat
              label={d("money.paid")}
              value={usdLabel(totals.paidMinor)}
              large
              muted={totals.paidMinor === 0}
            />
          </StatRow>

          <DeskSectionBlock id="ugc-budgets" title={d("budgetsTitle")}>
            <Table caption={d("budgetsTitle")} className="hidden md:block">
              <thead>
                <tr>
                  <Th>{d("col.brief")}</Th>
                  <Th>{d("col.status")}</Th>
                  <Th numeric>{d("col.budget")}</Th>
                  <Th>{d("col.deposit")}</Th>
                  <Th>{d("col.action")}</Th>
                </tr>
              </thead>
              <tbody>
                {desk.campaigns.map((campaign) => (
                  <Tr key={campaign.id}>
                    <Td className="max-w-[18rem]">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-medium break-words underline-offset-4 hover:underline"
                      >
                        {campaign.productName}
                      </Link>
                      <p className="t-body-s font-mono text-fg-muted">
                        {d("budgetFormula", {
                          videos: campaign.videosWanted,
                          price: usdLabel(Number(campaign.bountyMinor)),
                        })}
                      </p>
                    </Td>
                    <Td>
                      <CampaignStatus status={campaign.status} />
                    </Td>
                    <Td numeric>{usdLabel(campaign.budgetMinor)}</Td>
                    <Td>{d(`deposit.${depositKey(campaign)}`)}</Td>
                    <Td className="py-3">{action(campaign) ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line md:hidden">
              {desk.campaigns.map((campaign) => (
                <li key={campaign.id} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="min-w-0 font-medium break-words underline-offset-4 hover:underline"
                    >
                      {campaign.productName}
                    </Link>
                    <CampaignStatus status={campaign.status} />
                  </div>
                  <p className="t-body-s font-mono">
                    {usdLabel(campaign.budgetMinor)}
                    <span className="text-fg-muted">
                      {" "}
                      ·{" "}
                      {d("budgetFormula", {
                        videos: campaign.videosWanted,
                        price: usdLabel(Number(campaign.bountyMinor)),
                      })}
                    </span>
                  </p>
                  <p className="t-body-s">
                    {d(`deposit.${depositKey(campaign)}`)}
                  </p>
                  {action(campaign)}
                </li>
              ))}
            </ul>
          </DeskSectionBlock>

          <DeskSectionBlock id="ugc-rewards" title={d("rewardsTitle")}>
            {rewards.length === 0 ? (
              <DeskEmpty
                title={d("rewardsEmpty")}
                text={d("rewardsEmptyText")}
              />
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                {rewards.map(({ campaign, participant, payout }) => (
                  <li
                    key={participant.inviteId}
                    className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-col">
                      <p className="font-medium break-words">
                        {participant.creator?.displayName || t("creator")}
                      </p>
                      <p className="t-body-s break-words text-fg-muted">
                        {campaign.productName}
                      </p>
                    </div>
                    <p className="t-body-s flex items-center gap-3">
                      <span className="t-data">
                        {usdLabel(Number(payout.amountMinor))}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={
                            payout.status === "paid"
                              ? "inline-block size-1.5 rounded-full bg-success"
                              : "inline-block size-1.5 rounded-full border border-line-strong"
                          }
                        />
                        {d(`reward.${payout.status}`)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="t-body-s text-fg-muted">{d("rewardsNote")}</p>
          </DeskSectionBlock>
        </>
      )}
    </DeskShell>
  );
}
