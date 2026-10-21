import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  CAMPAIGN_GROUPS,
  campaignGroup,
  pickGroup,
  usdLabel,
  type WorkspaceCampaign,
} from "@/modules/ugc/service";
import {
  CampaignStatus,
  DeskEmpty,
  DeskFilter,
  DeskShell,
  DeskSkeleton,
  NeedCompany,
} from "@/modules/ugc/ui/desk";
import { requireDeskUser, loadDesk, nextHref, nextKey } from "../desk-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugcDesk" });
  return { title: t("nav.campaigns"), robots: { index: false, follow: false } };
}

/** Every brief of the member's companies, filtered by where it stands (D519). */
export default async function CampaignListPage({
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
      <CampaignListBody userId={userId} view={query.view} />
    </Suspense>
  );
}

async function CampaignListBody({
  userId,
  view: rawView,
}: {
  userId: string;
  view?: string;
}) {
  const d = await getTranslations("ugcDesk");
  const h = await getTranslations("ugcHub");
  const desk = await loadDesk(userId);
  const view = pickGroup(CAMPAIGN_GROUPS, rawView);
  const rows = desk.campaigns.filter(
    (row) => view === "all" || campaignGroup(row.status) === view,
  );
  const stepLabel = (row: WorkspaceCampaign) =>
    row.progress.step === "done"
      ? h("stepDone")
      : row.progress.step === "rejected"
        ? h("stepRejected")
        : h(`steps.${row.progress.step}`);
  const hiredOf = (row: WorkspaceCampaign) =>
    d("hiredOf", {
      hired: row.progress.counts.hired,
      wanted: row.videosWanted,
    });

  return (
    <DeskShell
      active="campaigns"
      title={d("nav.campaigns")}
      intro={d("campaignsIntro")}
      counts={desk.counts}
    >
      {desk.companies.length === 0 ? (
        <NeedCompany />
      ) : (
        <>
          <DeskFilter
            label={d("filterLabel")}
            items={CAMPAIGN_GROUPS.map((group) => ({
              value: group,
              label: d(`campaignGroup.${group}`),
              href:
                group === "active"
                  ? "/campaigns/list"
                  : `/campaigns/list?view=${group}`,
              active: group === view,
              count: desk.campaigns.filter(
                (row) => group === "all" || campaignGroup(row.status) === group,
              ).length,
            }))}
          />
          {rows.length === 0 ? (
            <DeskEmpty
              title={d("campaignsEmpty")}
              text={d("campaignsEmptyText")}
              action={
                <ButtonLink href="/campaigns/new" variant="strong">
                  {d("newBrief")}
                </ButtonLink>
              }
            />
          ) : (
            <>
              <Table caption={d("nav.campaigns")} className="hidden md:block">
                <thead>
                  <tr>
                    <Th>{d("col.brief")}</Th>
                    <Th>{d("col.status")}</Th>
                    <Th>{d("col.step")}</Th>
                    <Th>{d("col.deadline")}</Th>
                    <Th numeric>{d("col.hired")}</Th>
                    <Th numeric>{d("col.budget")}</Th>
                    <Th>{d("col.next")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Tr key={row.id}>
                      <Td className="max-w-[18rem]">
                        <Link
                          href={`/campaigns/${row.id}`}
                          className="font-medium break-words underline-offset-4 hover:underline"
                        >
                          {row.productName}
                        </Link>
                      </Td>
                      <Td>
                        <CampaignStatus status={row.status} />
                      </Td>
                      <Td>{stepLabel(row)}</Td>
                      <Td mono>{row.deadline}</Td>
                      <Td numeric>{hiredOf(row)}</Td>
                      <Td numeric>{usdLabel(row.budgetMinor)}</Td>
                      <Td>
                        {row.progress.next ? (
                          <Link
                            href={nextHref(row)}
                            className="font-medium underline underline-offset-4"
                          >
                            {h(nextKey(row.progress.next))}
                          </Link>
                        ) : (
                          <span className="text-fg-muted">—</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line md:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="flex flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/campaigns/${row.id}`}
                        className="min-w-0 font-medium break-words underline-offset-4 hover:underline"
                      >
                        {row.productName}
                      </Link>
                      <CampaignStatus status={row.status} />
                    </div>
                    <dl className="t-body-s grid grid-cols-2 gap-x-4 gap-y-2">
                      <dt className="text-fg-muted">{d("col.step")}</dt>
                      <dd>{stepLabel(row)}</dd>
                      <dt className="text-fg-muted">{d("col.deadline")}</dt>
                      <dd className="font-mono">{row.deadline}</dd>
                      <dt className="text-fg-muted">{d("col.hired")}</dt>
                      <dd className="font-mono">{hiredOf(row)}</dd>
                      <dt className="text-fg-muted">{d("col.budget")}</dt>
                      <dd className="font-mono">{usdLabel(row.budgetMinor)}</dd>
                    </dl>
                    {row.progress.next ? (
                      <ButtonLink
                        href={nextHref(row)}
                        variant="secondary"
                        className="self-start"
                      >
                        {h(nextKey(row.progress.next))}
                      </ButtonLink>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </DeskShell>
  );
}
