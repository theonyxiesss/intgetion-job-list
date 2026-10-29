import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  CAMPAIGN_GROUPS,
  companyDeskPage,
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
import { listHref } from "../desk-query";

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
  searchParams: Promise<{
    view?: string;
    company?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const userId = await requireDeskUser(locale);
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <CampaignListBody userId={userId} query={query} />
    </Suspense>
  );
}

async function CampaignListBody({
  userId,
  query,
}: {
  userId: string;
  query: { view?: string; company?: string; q?: string; page?: string };
}) {
  const d = await getTranslations("ugcDesk");
  const h = await getTranslations("ugcHub");
  const desk = await loadDesk(userId);
  const view = pickGroup(CAMPAIGN_GROUPS, query.view);
  // A company id that is not the member's own gives an empty list, not a leak.
  const company = desk.companies.find((row) => row.id === query.company);
  const search = (query.q ?? "").trim().slice(0, 80);
  const paged = await companyDeskPage(userId, {
    companyId: company?.id,
    group: view,
    search,
    page: Number(query.page) || 1,
  });
  const rows = paged.items;
  const pages = Math.max(1, Math.ceil(paged.total / paged.pageSize));
  const href = (over: {
    view?: string;
    company?: string | null;
    page?: number;
  }) =>
    listHref({
      view: over.view ?? view,
      company: over.company === undefined ? company?.id : over.company,
      q: search,
      page: over.page ?? 1,
    });
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
      title={
        company && desk.companies.length > 1
          ? `${d("nav.campaigns")} · ${company.name}`
          : d("nav.campaigns")
      }
      intro={d("campaignsIntro")}
      counts={desk.counts}
    >
      {desk.companies.length === 0 ? (
        <NeedCompany />
      ) : (
        <>
          {desk.companies.length > 1 ? (
            <DeskFilter
              label={d("companyLabel")}
              items={[
                {
                  value: "all",
                  label: d("companyAll"),
                  href: href({ company: null }),
                  active: !company,
                  count: paged.groups.all,
                },
                ...desk.companies.map((row) => ({
                  value: row.id,
                  label: row.name,
                  href: href({ company: row.id }),
                  active: company?.id === row.id,
                })),
              ]}
            />
          ) : null}
          <DeskFilter
            label={d("filterLabel")}
            items={CAMPAIGN_GROUPS.map((group) => ({
              value: group,
              label: d(`campaignGroup.${group}`),
              href: href({ view: group }),
              active: group === view,
              count: paged.groups[group],
            }))}
          />
          <form
            action="/campaigns/list"
            method="get"
            role="search"
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="view" value={view} />
            {company ? (
              <input type="hidden" name="company" value={company.id} />
            ) : null}
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="t-label text-fg-muted">{d("searchLabel")}</span>
              <input
                type="search"
                name="q"
                defaultValue={search}
                maxLength={80}
                className="w-full min-h-11 rounded-md border border-line-strong bg-surface px-3 text-fg"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5"
            >
              {d("searchButton")}
            </button>
          </form>
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
              {pages > 1 ? (
                <nav
                  aria-label={d("pagerLabel")}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <span className="t-data text-fg-muted">
                    {d("pagerOf", { page: paged.page, pages })}
                  </span>
                  <span className="flex gap-3">
                    {paged.page > 1 ? (
                      <ButtonLink
                        href={href({ page: paged.page - 1 })}
                        variant="secondary"
                      >
                        {d("pagerPrev")}
                      </ButtonLink>
                    ) : null}
                    {paged.page < pages ? (
                      <ButtonLink
                        href={href({ page: paged.page + 1 })}
                        variant="secondary"
                      >
                        {d("pagerNext")}
                      </ButtonLink>
                    ) : null}
                  </span>
                </nav>
              ) : null}
            </>
          )}
        </>
      )}
    </DeskShell>
  );
}
