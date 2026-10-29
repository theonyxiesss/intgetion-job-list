import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RouteMessages } from "@/components/shell/route-messages";
import {
  MATERIAL_GROUPS,
  materialGroup,
  pickGroup,
} from "@/modules/ugc/service";
import {
  DeskEmpty,
  DeskCompanies,
  DeskFilter,
  DeskPager,
  DeskShell,
  DeskSkeleton,
  NeedCompany,
} from "@/modules/ugc/ui/desk";
import { VideoReviewItem } from "@/modules/ugc/ui/video-review";
import { requireDeskUser, loadDesk } from "../desk-data";
import { deskPath, paginate } from "../desk-query";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugcDesk" });
  return {
    title: t("nav.materials"),
    robots: { index: false, follow: false },
  };
}

/**
 * Handed-in videos of all briefs as a review queue: large preview at the
 * left, the decision at the right (D519). Decisions are the brief page's.
 */
export default async function MaterialsPage({
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
      <MaterialsBody
        userId={userId}
        locale={locale}
        view={query.view}
        companyId={query.company}
        page={Number(query.page) || 1}
      />
    </Suspense>
  );
}

async function MaterialsBody({
  userId,
  locale,
  view: rawView,
  companyId,
  page: rawPage,
}: {
  userId: string;
  locale: string;
  view?: string;
  companyId?: string;
  page: number;
}) {
  const d = await getTranslations("ugcDesk");
  const t = await getTranslations("ugc");
  const desk = await loadDesk(userId, companyId);
  const view = pickGroup(MATERIAL_GROUPS, rawView);
  const here = (over: {
    view?: string;
    company?: string | null;
    page?: number;
  }) =>
    deskPath("/campaigns/materials", {
      view: over.view ?? view,
      defaultView: "waiting",
      company: over.company === undefined ? desk.company?.id : over.company,
      page: over.page,
    });
  const all = desk.campaigns.flatMap((campaign) =>
    campaign.participants.flatMap((participant) =>
      participant.submission
        ? [{ campaign, participant, submission: participant.submission }]
        : [],
    ),
  );
  const filtered = all.filter(
    (row) => materialGroup(row.submission.status) === view,
  );
  const paged = paginate(filtered, rawPage);
  const rows = paged.items;
  const winnersLinks = desk.campaigns.filter((campaign) =>
    campaign.participants.some((row) => row.submission?.status === "winner"),
  );

  return (
    <RouteMessages namespaces={["ugc"]}>
      <DeskShell
        active="materials"
        title={
          desk.company && desk.companies.length > 1
            ? `${d("nav.materials")} · ${desk.company.name}`
            : d("nav.materials")
        }
        intro={d("materialsIntro")}
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
              items={MATERIAL_GROUPS.map((group) => ({
                value: group,
                label: d(`materialGroup.${group}`),
                href: here({ view: group }),
                active: group === view,
                count: all.filter(
                  (row) => materialGroup(row.submission.status) === group,
                ).length,
              }))}
            />
            {rows.length === 0 ? (
              <DeskEmpty
                title={d(`materialsEmpty.${view}`)}
                text={all.length === 0 ? d("materialsEmptyText") : undefined}
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {rows.map((row) => (
                  <VideoReviewItem
                    key={row.participant.inviteId}
                    campaign={row.campaign}
                    participant={row.participant}
                    locale={locale}
                  />
                ))}
              </ul>
            )}
            <DeskPager
              page={paged.page}
              pages={paged.pages}
              hrefFor={(page) => here({ page })}
            />
            {winnersLinks.length > 0 ? (
              <p className="t-body-s text-fg-muted">
                {t("winners")}:{" "}
                {winnersLinks.map((campaign, index) => (
                  <span key={campaign.id}>
                    {index > 0 ? " · " : null}
                    <Link
                      href={`/campaigns/${campaign.id}/winners`}
                      className="underline underline-offset-4"
                    >
                      {campaign.productName}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </>
        )}
      </DeskShell>
    </RouteMessages>
  );
}
