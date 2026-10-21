import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { RouteMessages } from "@/components/shell/route-messages";
import {
  ORDER_GROUPS,
  orderGroup,
  pickGroup,
  usdLabel,
  type WorkspaceCampaign,
  type WorkspaceParticipant,
} from "@/modules/ugc/service";
import { UgcAction } from "@/modules/ugc/ui/action";
import {
  DeskEmpty,
  DeskFilter,
  DeskShell,
  DeskSkeleton,
  Monogram,
  NeedCompany,
  ParticipationStatus,
} from "@/modules/ugc/ui/desk";
import { requireDeskUser, loadDesk, offerOpen } from "../desk-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugcDesk" });
  return { title: t("nav.orders"), robots: { index: false, follow: false } };
}

type Row = { campaign: WorkspaceCampaign; participant: WorkspaceParticipant };

/**
 * Orders are participations (27.4): responses, hire offers, hired creators
 * and finished ones, across all briefs. Same writes as the brief page.
 */
export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const userId = await requireDeskUser(locale);
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <OrdersBody userId={userId} view={query.view} />
    </Suspense>
  );
}

async function OrdersBody({
  userId,
  view: rawView,
}: {
  userId: string;
  view?: string;
}) {
  const t = await getTranslations("ugc");
  const d = await getTranslations("ugcDesk");
  const desk = await loadDesk(userId);
  const view = pickGroup(ORDER_GROUPS, rawView);
  const all: Row[] = desk.campaigns.flatMap((campaign) =>
    campaign.participants.map((participant) => ({ campaign, participant })),
  );
  const rows = all.filter((row) => orderGroup(row.participant) === view);

  const reward = ({ campaign, participant }: Row) =>
    usdLabel(Number(participant.bountyMinor ?? campaign.bountyMinor));
  const rights = ({ campaign, participant }: Row) =>
    t(`rights.${participant.rights ?? campaign.brief.rights}`);

  function actions(row: Row) {
    const { campaign, participant } = row;
    if (participant.status === "applied" && participant.creator) {
      return offerOpen(campaign) ? (
        <UgcAction
          action="offer"
          label={t("offer")}
          body={{
            campaignId: campaign.id,
            creatorId: participant.creator.userId,
          }}
          primary
        />
      ) : (
        <p className="t-body-s text-fg-muted">
          {campaign.status === "open"
            ? d("offerAfterDeposit")
            : d("offerClosed")}
        </p>
      );
    }
    if (
      (participant.status === "offered" ||
        (participant.status === "hired" && !participant.submission)) &&
      participant.reminders < 1
    ) {
      return (
        <UgcAction
          action="remind"
          label={t("remind")}
          body={{ inviteId: participant.inviteId }}
        />
      );
    }
    if (participant.submission) {
      return (
        <Link
          href={`/campaigns/materials?view=${
            participant.submission.status === "submitted"
              ? "waiting"
              : participant.submission.status === "changes_requested"
                ? "changes"
                : participant.submission.status === "rejected"
                  ? "rejected"
                  : "accepted"
          }`}
          className="t-body-s font-medium underline underline-offset-4"
        >
          {d("toVideo")}
        </Link>
      );
    }
    return <span className="text-fg-muted">—</span>;
  }

  return (
    <RouteMessages namespaces={["ugc"]}>
      <DeskShell
        active="orders"
        title={d("nav.orders")}
        intro={d("ordersIntro")}
        counts={desk.counts}
      >
        {desk.companies.length === 0 ? (
          <NeedCompany />
        ) : (
          <>
            <DeskFilter
              label={d("filterLabel")}
              items={ORDER_GROUPS.map((group) => ({
                value: group,
                label: d(`orderGroup.${group}`),
                href:
                  group === "applied"
                    ? "/campaigns/orders"
                    : `/campaigns/orders?view=${group}`,
                active: group === view,
                count: all.filter(
                  (row) => orderGroup(row.participant) === group,
                ).length,
              }))}
            />
            {rows.length === 0 ? (
              <DeskEmpty
                title={d(`ordersEmpty.${view}`)}
                text={all.length === 0 ? d("ordersEmptyText") : undefined}
              />
            ) : (
              <>
                <Table caption={d("nav.orders")} className="hidden md:block">
                  <thead>
                    <tr>
                      <Th>{d("col.creator")}</Th>
                      <Th>{d("col.brief")}</Th>
                      <Th>{d("col.status")}</Th>
                      <Th numeric>{d("col.reward")}</Th>
                      <Th>{d("col.rights")}</Th>
                      <Th>{d("col.action")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const name =
                        row.participant.creator?.displayName || t("creator");
                      return (
                        <Tr key={row.participant.inviteId}>
                          <Td>
                            <span className="flex items-center gap-3">
                              <Monogram name={name} />
                              <span className="font-medium break-words">
                                {name}
                              </span>
                            </span>
                          </Td>
                          <Td className="max-w-[16rem]">
                            <Link
                              href={`/campaigns/${row.campaign.id}#ugc-people`}
                              className="break-words underline-offset-4 hover:underline"
                            >
                              {row.campaign.productName}
                            </Link>
                          </Td>
                          <Td>
                            <ParticipationStatus
                              status={row.participant.status}
                            />
                          </Td>
                          <Td numeric>{reward(row)}</Td>
                          <Td>{rights(row)}</Td>
                          <Td className="py-3">{actions(row)}</Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
                <ul className="flex flex-col divide-y divide-line rounded-lg border border-line md:hidden">
                  {rows.map((row) => {
                    const name =
                      row.participant.creator?.displayName || t("creator");
                    return (
                      <li
                        key={row.participant.inviteId}
                        className="flex flex-col gap-3 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Monogram name={name} />
                          <div className="flex min-w-0 flex-col">
                            <p className="font-medium break-words">{name}</p>
                            <Link
                              href={`/campaigns/${row.campaign.id}#ugc-people`}
                              className="t-body-s break-words text-fg-muted underline-offset-4 hover:underline"
                            >
                              {row.campaign.productName}
                            </Link>
                          </div>
                        </div>
                        <div className="t-body-s flex flex-wrap items-center gap-x-4 gap-y-1">
                          <ParticipationStatus
                            status={row.participant.status}
                          />
                          <span className="font-mono">{reward(row)}</span>
                          <span className="text-fg-muted">{rights(row)}</span>
                        </div>
                        {actions(row)}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </DeskShell>
    </RouteMessages>
  );
}
