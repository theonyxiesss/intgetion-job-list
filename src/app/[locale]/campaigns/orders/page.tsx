import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderCard } from "@/components/ui/order-card";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import { ORDER_STEPS } from "@/lib/order-stage";
import { RouteMessages } from "@/components/shell/route-messages";
import {
  monogram,
  ORDER_GROUPS,
  orderGroup,
  participationStage,
  pickGroup,
  usdLabel,
  type WorkspaceCampaign,
  type WorkspaceParticipant,
} from "@/modules/ugc/service";
import { UgcAction } from "@/modules/ugc/ui/action";
import {
  DeskEmpty,
  DeskCompanies,
  DeskFilter,
  DeskPager,
  DeskShell,
  DeskSkeleton,
  NeedCompany,
} from "@/modules/ugc/ui/desk";
import { requireDeskUser, loadDesk, offerOpen } from "../desk-data";
import { deskPath, paginate } from "../desk-query";

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
  searchParams: Promise<{ view?: string; company?: string; page?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const userId = await requireDeskUser(locale);
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <OrdersBody
        locale={locale}
        userId={userId}
        view={query.view}
        companyId={query.company}
        page={Number(query.page) || 1}
      />
    </Suspense>
  );
}

async function OrdersBody({
  locale,
  userId,
  view: rawView,
  companyId,
  page: rawPage,
}: {
  locale: string;
  userId: string;
  view?: string;
  companyId?: string;
  page: number;
}) {
  const t = await getTranslations("ugc");
  const d = await getTranslations("ugcDesk");
  const card = await getTranslations("ui.orderCard");
  const stepLabels = {
    accepted: card("steps.accepted"),
    work: card("steps.work"),
    review: card("steps.review"),
    done: card("steps.done"),
  };
  const dates = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const desk = await loadDesk(userId, companyId);
  const view = pickGroup(ORDER_GROUPS, rawView);
  const here = (over: {
    view?: string;
    company?: string | null;
    page?: number;
  }) =>
    deskPath("/campaigns/orders", {
      view: over.view ?? view,
      defaultView: "applied",
      company: over.company === undefined ? desk.company?.id : over.company,
      page: over.page,
    });
  const all: Row[] = desk.campaigns.flatMap((campaign) =>
    campaign.participants.map((participant) => ({ campaign, participant })),
  );
  const filtered = all.filter((row) => orderGroup(row.participant) === view);
  const paged = paginate(filtered, rawPage);
  const rows = paged.items;

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
    return null;
  }

  return (
    <RouteMessages namespaces={["ugc"]}>
      <DeskShell
        active="orders"
        title={
          desk.company && desk.companies.length > 1
            ? `${d("nav.orders")} · ${desk.company.name}`
            : d("nav.orders")
        }
        intro={d("ordersIntro")}
        counts={desk.counts}
      >
        {desk.companies.length === 0 ? (
          <NeedCompany />
        ) : (
          <>
            <DeskCompanies
              companies={desk.companies}
              selectedId={desk.company?.id}
              hrefFor={(id) => here({ company: id })}
            />
            <DeskFilter
              label={d("filterLabel")}
              items={ORDER_GROUPS.map((group) => ({
                value: group,
                label: d(`orderGroup.${group}`),
                href: here({ view: group }),
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
                <ul className="grid gap-4 lg:grid-cols-2">
                  {rows.map((row) => {
                    const { campaign, participant } = row;
                    const name =
                      participant.creator?.displayName || t("creator");
                    const stage = participationStage(participant);
                    const deadline = new Date(
                      `${campaign.deadline}T00:00:00.000Z`,
                    );
                    return (
                      <li key={participant.inviteId}>
                        <OrderCard
                          href={`/campaigns/${campaign.id}#ugc-people`}
                          icon="ugc"
                          code={`UGC / ${participant.inviteId
                            .slice(0, 4)
                            .toUpperCase()}`}
                          status={
                            participant.status === "hired" &&
                            participant.submission
                              ? t(`status.${participant.submission.status}`)
                              : stage.step !== null
                                ? stepLabels[ORDER_STEPS[stage.step]]
                                : t(`status.${participant.status}`)
                          }
                          stage={stage}
                          stepLabels={stepLabels}
                          stepsLabel={card("stepsLabel")}
                          title={campaign.productName}
                          headingLevel={2}
                          subtitle={rights(row)}
                          price={{ label: card("reward"), value: reward(row) }}
                          date={{
                            label: card("deadline"),
                            value: (
                              <time dateTime={campaign.deadline}>
                                {dates.format(deadline)}
                              </time>
                            ),
                          }}
                          person={{ name, initials: monogram(name) }}
                          actions={actions(row)}
                        />
                      </li>
                    );
                  })}
                </ul>
                <DeskPager
                  page={paged.page}
                  pages={paged.pages}
                  hrefFor={(page) => here({ page })}
                />
              </>
            )}
          </>
        )}
      </DeskShell>
    </RouteMessages>
  );
}
