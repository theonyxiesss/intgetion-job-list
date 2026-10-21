import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { RouteMessages } from "@/components/shell/route-messages";
import { creatorsFrom, workspaceMatches } from "@/modules/ugc/service";
import { UgcAction } from "@/modules/ugc/ui/action";
import {
  CreatorProfileCard,
  DeskEmpty,
  DeskSectionBlock,
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
  return { title: t("nav.creators"), robots: { index: false, follow: false } };
}

/**
 * Creators of the company's briefs as portfolios, then matching creators
 * for each open brief (27.7). Public cards only: no contact (D519).
 */
export default async function CreatorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireDeskUser(locale);
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <CreatorsBody userId={userId} />
    </Suspense>
  );
}

async function CreatorsBody({ userId }: { userId: string }) {
  const t = await getTranslations("ugc");
  const d = await getTranslations("ugcDesk");
  const desk = await loadDesk(userId);
  const people = creatorsFrom(desk.campaigns);
  const matches = await workspaceMatches(desk.userId, desk.campaigns);

  return (
    <RouteMessages namespaces={["ugc"]}>
      <DeskShell
        active="creators"
        title={d("nav.creators")}
        intro={d("creatorsIntro")}
        counts={desk.counts}
      >
        {desk.companies.length === 0 ? (
          <NeedCompany />
        ) : (
          <>
            <DeskSectionBlock id="ugc-people-all" title={d("inBriefs")}>
              {people.length === 0 ? (
                <DeskEmpty
                  title={d("creatorsEmpty")}
                  text={d("creatorsEmptyText")}
                />
              ) : (
                <ul className="flex flex-col gap-4">
                  {people.map(({ card, rows }) => (
                    <li
                      key={card.userId}
                      className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
                    >
                      <CreatorProfileCard card={card} />
                      <div className="flex flex-col gap-3 rounded-lg border border-line p-4 md:p-5">
                        <p className="t-label text-fg-muted">
                          {d("participations")}
                        </p>
                        <ul className="flex flex-col divide-y divide-line">
                          {rows.map(({ campaign, participant }) => (
                            <li
                              key={participant.inviteId}
                              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Link
                                  href={`/campaigns/${campaign.id}#ugc-people`}
                                  className="t-body-s min-w-0 font-medium break-words underline-offset-4 hover:underline"
                                >
                                  {campaign.productName}
                                </Link>
                                <ParticipationStatus
                                  status={participant.status}
                                />
                              </div>
                              {participant.status === "applied" &&
                              offerOpen(campaign) ? (
                                <UgcAction
                                  action="offer"
                                  label={t("offer")}
                                  body={{
                                    campaignId: campaign.id,
                                    creatorId: card.userId,
                                  }}
                                  primary
                                />
                              ) : null}
                              {participant.status === "applied" &&
                              !offerOpen(campaign) &&
                              campaign.status === "open" ? (
                                <p className="t-body-s text-fg-muted">
                                  {d("offerAfterDeposit")}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DeskSectionBlock>

            <DeskSectionBlock id="ugc-matches" title={d("matchesTitle")}>
              <p className="t-body-s -mt-2 max-w-[68ch] text-fg-muted">
                {d("matchesIntro")}
              </p>
              {matches.length === 0 ? (
                <DeskEmpty
                  title={d("matchesNoOpen")}
                  text={d("matchesNoOpenText")}
                />
              ) : (
                <div className="flex flex-col gap-6">
                  {matches.map(({ campaign, matches: cards }) => (
                    <section
                      key={campaign.id}
                      aria-labelledby={`ugc-match-${campaign.id}`}
                      className="flex flex-col gap-3"
                    >
                      <h3
                        id={`ugc-match-${campaign.id}`}
                        className="font-medium break-words"
                      >
                        {campaign.productName}
                      </h3>
                      {cards.length === 0 ? (
                        <DeskEmpty
                          title={d("matchesEmpty")}
                          text={d("matchesEmptyText")}
                          action={
                            <ButtonLink
                              href={`/campaigns/${campaign.id}#ugc-manage`}
                              variant="secondary"
                            >
                              {t("join")}
                            </ButtonLink>
                          }
                        />
                      ) : (
                        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                          {cards.map((card) => (
                            <li
                              key={card.userId}
                              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Monogram
                                  name={card.displayName || t("creator")}
                                />
                                <div className="flex min-w-0 flex-col">
                                  <p className="font-medium break-words">
                                    {card.displayName || t("creator")}
                                  </p>
                                  <p className="t-body-s break-words text-fg-muted">
                                    {[
                                      card.platforms
                                        .map((p) => t(`platforms.${p}`))
                                        .join(", "),
                                      card.niches
                                        .map((n) => t(`niches.${n}`))
                                        .join(", "),
                                      card.languages
                                        .map((code) => code.toUpperCase())
                                        .join(" · "),
                                    ]
                                      .filter(Boolean)
                                      .join(" — ")}
                                  </p>
                                  <p className="t-body-s font-mono text-fg-muted">
                                    {d("examplesCount", {
                                      count: card.exampleUrls.length,
                                    })}
                                  </p>
                                </div>
                              </div>
                              {offerOpen(campaign) ? (
                                <UgcAction
                                  action="offer"
                                  label={t("offer")}
                                  body={{
                                    campaignId: campaign.id,
                                    creatorId: card.userId,
                                  }}
                                />
                              ) : (
                                <p className="t-body-s text-fg-muted sm:max-w-[16rem]">
                                  {d("offerAfterDeposit")}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </DeskSectionBlock>
          </>
        )}
      </DeskShell>
    </RouteMessages>
  );
}
