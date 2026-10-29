import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Stat, StatRow } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import {
  attentionItems,
  companyWorkspace,
  deskTotals,
  UGC_STEPS,
  ugcPriceGuide,
  usdLabel,
  type UgcPriceGuide,
} from "@/modules/ugc/service";
import { StepTrack } from "@/modules/ugc/ui/step-track";
import {
  CampaignStatus,
  DeskEmpty,
  DeskSectionBlock,
  DeskCompanies,
  DeskShell,
  DeskSkeleton,
  SubmissionStatus,
  VideoPreview,
} from "@/modules/ugc/ui/desk";
import { deskCounts, nextHref } from "./desk-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * UGC videos. A guest or a person without a company sees the two doors
 * (D464). A company member sees the workspace overview (D519): what waits
 * on them, the counts they already have, fresh videos and their briefs.
 */
export default async function CampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ company?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const companies = user ? await getCompaniesForUser(user.id) : [];
  const guide = await ugcPriceGuide();
  if (!user || companies.length === 0) {
    return <Doors signedIn={Boolean(user)} guide={guide} />;
  }
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <Overview
        userId={user.id}
        guide={guide}
        companies={companies.map((row) => ({ id: row.id, name: row.name }))}
        companyId={query.company}
      />
    </Suspense>
  );
}

/** The member's overview; reads every brief, so it streams (D519). */
async function Overview({
  userId,
  guide,
  companies,
  companyId,
}: {
  userId: string;
  guide: UgcPriceGuide;
  companies: { id: string; name: string }[];
  companyId?: string;
}) {
  const t = await getTranslations("ugc");
  const h = await getTranslations("ugcHub");
  const d = await getTranslations("ugcDesk");
  // A company id that is not the member's own selects nothing (TZ 48 §3).
  const company = companies.find((row) => row.id === companyId);
  const campaigns = await companyWorkspace(userId, { companyId: company?.id });
  const counts = deskCounts(campaigns);
  const title =
    company && companies.length > 1
      ? `${d("overviewTitle")} · ${company.name}`
      : d("overviewTitle");
  const chooser = (
    <DeskCompanies
      companies={companies}
      selectedId={company?.id}
      hrefFor={(id) => (id ? `/campaigns?company=${id}` : "/campaigns")}
    />
  );

  if (campaigns.length === 0) {
    return (
      <DeskShell active="overview" title={title} counts={counts}>
        {chooser}
        <section
          aria-labelledby="ugc-start"
          className="grid gap-8 rounded-lg border border-line p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 id="ugc-start" className="t-h3">
                {h("emptyTitle")}
              </h2>
              <p className="max-w-[60ch] text-fg-muted">{d("startText")}</p>
            </div>
            <ol className="flex flex-col divide-y divide-line border-y border-line">
              {(["start1", "start2", "start3"] as const).map((key, index) => (
                <li key={key} className="flex gap-4 py-4">
                  <span className="t-data text-fg-muted">{`0${index + 1}`}</span>
                  <span className="flex flex-col gap-1">
                    <span className="font-medium">{d(`${key}Title`)}</span>
                    <span className="t-body-s text-fg-muted">
                      {d(`${key}Text`)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/campaigns/new" variant="strong">
                {d("fillForm")}
              </ButtonLink>
              <ButtonLink href="/chat?from=campaigns" variant="secondary">
                {h("doorCompanyAction")}
              </ButtonLink>
            </div>
          </div>
          <aside
            aria-label={h("exampleTitle")}
            className="t-body-s flex flex-col gap-2 self-start rounded-md bg-surface-2 p-5"
          >
            <p className="t-label text-fg-muted">{h("exampleTitle")}</p>
            <p className="font-medium">{h("exampleProduct")}</p>
            <p>{h("exampleVideos")}</p>
            <p className="font-mono">{h("exampleReward")}</p>
            <p className="text-fg-muted">{h("exampleRights")}</p>
            <p className="mt-2 border-t border-line pt-3 text-fg-muted">
              {priceLine(h, guide)}
            </p>
          </aside>
        </section>
      </DeskShell>
    );
  }

  const totals = deskTotals(campaigns);
  const attention = attentionItems(campaigns);
  const steps = Object.fromEntries(
    UGC_STEPS.map((step) => [step, h(`steps.${step}`)]),
  ) as Record<(typeof UGC_STEPS)[number], string>;
  const fresh = campaigns
    .flatMap((campaign) =>
      campaign.participants.flatMap((row) =>
        row.submission ? [{ campaign, row, submission: row.submission }] : [],
      ),
    )
    .sort(
      (a, b) =>
        Number(b.submission.status === "submitted") -
        Number(a.submission.status === "submitted"),
    )
    .slice(0, 3);

  return (
    <DeskShell active="overview" title={title} counts={counts}>
      {chooser}
      <DeskSectionBlock id="ugc-attention" title={d("attentionTitle")}>
        {attention.length === 0 ? (
          <DeskEmpty
            title={d("attentionEmpty")}
            text={d("attentionEmptyText")}
          />
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {attention.map((item) => {
              const campaign = campaigns.find(
                (row) => row.id === item.campaignId,
              )!;
              return (
                <li
                  key={`${item.kind}-${item.campaignId}`}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:px-5"
                >
                  <div className="flex min-w-0 flex-col gap-1 border-l-2 border-fg pl-3">
                    <p className="font-medium break-words">
                      {d(`attention.${item.kind}`, { count: item.count })}
                    </p>
                    <p className="t-body-s text-fg-muted break-words">
                      {item.productName}
                    </p>
                  </div>
                  <Link
                    href={nextHref(campaign)}
                    className="t-body-s inline-flex min-h-11 shrink-0 items-center gap-2 self-start font-medium underline-offset-4 hover:underline sm:self-auto"
                  >
                    {d(`attentionAction.${item.kind}`)}
                    <Icon icon={ArrowRight} size={16} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </DeskSectionBlock>

      <StatRow>
        <Stat label={d("stat.active")} value={totals.active} large />
        <Stat label={d("stat.applied")} value={totals.applied} large />
        <Stat label={d("stat.hired")} value={totals.hired} large />
        <Stat label={d("stat.waiting")} value={totals.waiting} large />
        <Stat label={d("stat.accepted")} value={totals.accepted} large />
      </StatRow>

      {fresh.length > 0 ? (
        <DeskSectionBlock
          id="ugc-fresh"
          title={d("freshTitle")}
          aside={
            <Link
              href="/campaigns/materials"
              className="t-body-s underline-offset-4 hover:underline"
            >
              {d("seeAll")}
            </Link>
          }
        >
          <ul className="flex flex-col gap-4 md:flex-row md:flex-wrap">
            {fresh.map(({ campaign, row, submission }) => {
              const name = row.creator?.displayName || t("creator");
              return (
                <li
                  key={row.inviteId}
                  className="flex gap-4 rounded-lg border border-line p-3 md:min-w-0 md:flex-1"
                >
                  <VideoPreview
                    url={submission.url}
                    hook={submission.hook}
                    creatorName={name}
                  />
                  <div className="flex min-w-0 flex-col gap-2 py-1">
                    <SubmissionStatus status={submission.status} />
                    <p className="font-medium break-words">{name}</p>
                    <Link
                      href={`/campaigns/${campaign.id}#ugc-videos`}
                      className="t-body-s break-words text-fg-muted underline-offset-4 hover:underline"
                    >
                      {campaign.productName}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </DeskSectionBlock>
      ) : null}

      <DeskSectionBlock
        id="ugc-mine"
        title={h("mineTitle")}
        aside={
          <Link
            href="/campaigns/list"
            className="t-body-s underline-offset-4 hover:underline"
          >
            {d("seeAll")}
          </Link>
        }
      >
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {campaigns.slice(0, 5).map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-4 md:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/campaigns/${row.id}`}
                    className="font-medium break-words underline-offset-4 hover:underline"
                  >
                    {row.productName}
                  </Link>
                  <CampaignStatus status={row.status} />
                </div>
                <p className="t-body-s font-mono text-fg-muted">
                  {h("budget", { total: usdLabel(row.budgetMinor) })}
                  {" · "}
                  {d("deadline", { date: row.deadline })}
                </p>
              </div>
              <StepTrack
                progress={row.progress}
                labels={steps}
                label={row.productName}
              />
            </li>
          ))}
        </ul>
      </DeskSectionBlock>

      <p className="t-body-s text-fg-muted">
        {d("creatorToo")}{" "}
        <Link href="/creator" className="underline underline-offset-4">
          {h("creatorProfile")}
        </Link>
        {" · "}
        <Link href="/creator/invites" className="underline underline-offset-4">
          {h("creatorInvites")}
        </Link>
      </p>
    </DeskShell>
  );
}

function priceLine(
  h: Awaited<ReturnType<typeof getTranslations>>,
  guide: UgcPriceGuide,
): string {
  return guide.source === "briefs"
    ? h("priceRange", {
        min: usdLabel(guide.minMinor),
        max: usdLabel(guide.maxMinor),
        median: usdLabel(guide.medianMinor),
      })
    : h("pricePresets", {
        list: guide.presets.map(usdLabel).join(", "),
        usual: usdLabel(guide.medianMinor),
      });
}

/** The two doors of D464, for a guest or a person without a company. */
async function Doors({
  signedIn,
  guide,
}: {
  signedIn: boolean;
  guide: UgcPriceGuide;
}) {
  const t = await getTranslations("ugc");
  const h = await getTranslations("ugcHub");
  const d = await getTranslations("ugcDesk");
  const door =
    "flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 md:p-6";
  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} intro={t("intro")} />

        <div className="grid gap-4 md:grid-cols-2">
          <section className={door} aria-labelledby="ugc-door-company">
            <h2 id="ugc-door-company" className="t-h3">
              {h("doorCompanyTitle")}
            </h2>
            <p className="t-body-s text-fg-muted">{h("doorCompanyText")}</p>
            {signedIn ? (
              <p className="t-body-s text-fg-muted">{d("needCompanyText")}</p>
            ) : null}
            <div className="mt-auto flex flex-wrap gap-3">
              <ButtonLink href="/chat?from=campaigns" variant="strong">
                {h("doorCompanyAction")}
              </ButtonLink>
              <ButtonLink
                href={signedIn ? "/employer/company" : "/login"}
                variant="secondary"
              >
                {signedIn ? d("createCompany") : t("signIn")}
              </ButtonLink>
            </div>
          </section>
          <section className={door} aria-labelledby="ugc-door-creator">
            <h2 id="ugc-door-creator" className="t-h3">
              {h("doorCreatorTitle")}
            </h2>
            <p className="t-body-s text-fg-muted">{h("doorCreatorText")}</p>
            <div className="mt-auto flex flex-wrap gap-3">
              <ButtonLink href="/creator/campaigns" variant="secondary">
                {h("doorCreatorAction")}
              </ButtonLink>
              <ButtonLink href="/creator" variant="secondary">
                {h("creatorProfile")}
              </ButtonLink>
              <ButtonLink href="/creator/invites" variant="secondary">
                {h("creatorInvites")}
              </ButtonLink>
            </div>
          </section>
        </div>

        <section className="flex flex-col gap-2" aria-labelledby="ugc-price">
          <h2 id="ugc-price" className="t-h3">
            {h("priceTitle")}
          </h2>
          <p className="t-body-s text-fg-muted">{priceLine(h, guide)}</p>
          <p className="t-body-s text-fg-muted">{t("moneyNote")}</p>
        </section>
      </Container>
    </main>
  );
}
