import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MessageSquare, Trophy } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { HttpError } from "@/lib/http";
import { formatMinor } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  campaignDepositState,
  campaignProgress,
  countParticipants,
  readCampaign,
  UGC_STEPS,
  ugcBudgetMinor,
  usdLabel,
} from "@/modules/ugc/service";
import { StepTrack } from "@/modules/ugc/ui/step-track";
import { UgcAction } from "@/modules/ugc/ui/action";
import { RejectApplication } from "@/modules/ugc/ui/reject-application";
import { BriefTextForm } from "@/modules/ugc/ui/brief-text-form";
import { UgcReport, UgcSubmit } from "@/modules/ugc/ui/fields";
import {
  CampaignStatus,
  DeskEmpty,
  DeskSectionBlock,
  DeskShell,
  Fact,
  Monogram,
  ParticipationStatus,
} from "@/modules/ugc/ui/desk";
import { VideoReviewItem } from "@/modules/ugc/ui/video-review";
import { RouteMessages } from "@/components/shell/route-messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ugc" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ugc");
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user) notFound();
  let view;
  try {
    view = await readCampaign(user.id, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const money = formatMinor(BigInt(view.brief.bountyMinor), "USD", locale, {
    wholeWhenEven: true,
  });
  const h = await getTranslations("ugcHub");
  const d = await getTranslations("ugcDesk");
  const budget = usdLabel(
    ugcBudgetMinor(view.brief.videosWanted, Number(view.brief.bountyMinor)),
  );

  if (view.role !== "company") {
    // The creator's side of a brief stays as it was (27.12).
    return (
      <RouteMessages namespaces={["ugc"]}>
        <main className="py-10 md:py-16">
          <Container className="flex max-w-3xl flex-col gap-6">
            <PageHeader
              title={view.brief.productName}
              intro={view.brief.productSummary}
            />
            <p className="font-mono text-fg">
              {money} · {t(`status.${view.brief.status}`)} ·{" "}
              {view.brief.deadline}
            </p>
            <p className="t-body-s text-fg-muted">{t("moneyNote")}</p>
            {view.invite.terms ? (
              <section
                aria-labelledby="offer-terms"
                className="flex flex-col gap-2 rounded-lg border border-border p-4"
              >
                <h2 id="offer-terms" className="t-h4">
                  {t("termsTitle")}
                </h2>
                <ul className="t-body-s flex flex-col gap-1">
                  <li>{t("termsVideos")}</li>
                  <li className="font-mono">
                    {t("termsReward")}:{" "}
                    {formatMinor(
                      BigInt(view.invite.terms.bountyMinor),
                      "USD",
                      locale,
                      { wholeWhenEven: true },
                    )}
                  </li>
                  <li className="font-mono">
                    {t("termsDeadline")}: {view.invite.terms.deadline}
                  </li>
                  <li>
                    {t(`rights.${view.invite.terms.rights}`)} ·{" "}
                    {t("termsLicense", {
                      months: view.invite.terms.licenseMonths,
                    })}
                  </li>
                  <li>
                    {t("termsReview", {
                      days: view.invite.terms.reviewBusinessDays,
                    })}
                  </li>
                  <li>
                    {t("termsMustSay")}: {view.invite.terms.mustSay}
                  </li>
                  <li>
                    {t("termsMustNot")}: {view.invite.terms.mustNot}
                  </li>
                </ul>
                {view.invite.status === "offered" ? (
                  <p className="t-body-s text-fg-muted">{t("termsNote")}</p>
                ) : null}
                {view.invite.agreedAt ? (
                  <p className="t-body-s text-fg-muted">
                    {t("agreedAt", {
                      date: view.invite.agreedAt.slice(0, 10),
                    })}
                  </p>
                ) : null}
              </section>
            ) : null}
            <div className="flex flex-col gap-3">
              <p className="font-mono">{t(`status.${view.invite.status}`)}</p>
              {view.invite.status === "declined" &&
              view.invite.declineReason ? (
                <p className="t-body-s text-fg-muted">
                  {t(`declineReason.${view.invite.declineReason}`)}
                </p>
              ) : null}
              {view.invite.status === "offered" && view.invite.termsChanged ? (
                <p role="alert" className="t-body-s">
                  {t("termsChanged")}
                </p>
              ) : null}
              {view.invite.status === "offered" ? (
                <div className="flex flex-wrap gap-3">
                  {view.invite.termsChanged ? null : (
                    <UgcAction
                      action="accept"
                      label={t("accept")}
                      body={{
                        inviteId: view.invite.id,
                        ...(view.invite.termsHash
                          ? { termsHash: view.invite.termsHash }
                          : {}),
                      }}
                      primary
                    />
                  )}
                  <UgcAction
                    action="decline"
                    label={t("decline")}
                    body={{ inviteId: view.invite.id }}
                  />
                </div>
              ) : null}
              {view.invite.status === "hired" &&
              (view.submission === null ||
                view.submission.status === "changes_requested") ? (
                <UgcSubmit inviteId={view.invite.id} />
              ) : null}
              {view.submission ? (
                <p className="t-body-s break-all">{view.submission.url}</p>
              ) : null}
              {view.submission &&
              (view.submission.status === "accepted" ||
                view.submission.status === "winner") ? (
                <UgcReport inviteId={view.invite.id} />
              ) : null}
              {view.submission?.liveUrl ? (
                <p className="t-body-s break-all">{view.submission.liveUrl}</p>
              ) : null}
              {view.submission?.reportedViews != null ? (
                <p className="t-body-s font-mono">
                  {t("reportedViews", { count: view.submission.reportedViews })}
                </p>
              ) : null}
              {view.payout ? (
                <p className="t-body-s">
                  {t(view.payout.status === "paid" ? "paidNote" : "owedNote", {
                    amount: formatMinor(
                      BigInt(view.payout.amountMinor),
                      "USD",
                      locale,
                      { wholeWhenEven: true },
                    ),
                  })}
                </p>
              ) : null}
              <ButtonLink
                href={`/chat?campaign=${view.brief.id}`}
                variant="secondary"
              >
                {t("thread")}
              </ButtonLink>
              <ButtonLink
                href={`/chat?invite=${view.invite.id}`}
                variant="secondary"
              >
                {t("thread")}
              </ButtonLink>
            </div>
          </Container>
        </main>
      </RouteMessages>
    );
  }

  const brief = view.brief;
  const steps = Object.fromEntries(
    UGC_STEPS.map((step) => [step, h(`steps.${step}`)]),
  ) as Record<(typeof UGC_STEPS)[number], string>;
  const deposit = await campaignDepositState(user.id, id);
  const progress = campaignProgress(
    brief.status,
    countParticipants(
      view.participants,
      view.participants.flatMap((row) =>
        row.submission ? [row.submission] : [],
      ),
    ),
    { depositNeeded: Boolean(deposit.required && !deposit.paid) },
  );
  const offerOpen =
    brief.status === "open" && (!deposit.required || deposit.paid);
  const people = [...view.participants].sort(
    (a, b) => Number(b.shortlisted) - Number(a.shortlisted),
  );
  const videos = people.filter((row) => row.submission);
  const countries = brief.countries.length
    ? brief.countries.join(", ")
    : (brief.country ?? d("anyCountry"));
  const next = progress.next;

  return (
    <RouteMessages namespaces={["ugc"]}>
      <DeskShell
        active="campaigns"
        title={brief.productName}
        intro={brief.productSummary}
        actions={
          <>
            <ButtonLink
              href={`/chat?campaign=${brief.id}`}
              variant="secondary"
              icon={<Icon icon={MessageSquare} size={16} />}
            >
              {t("thread")}
            </ButtonLink>
            <ButtonLink
              href={`/campaigns/${id}/winners`}
              variant="secondary"
              icon={<Icon icon={Trophy} size={16} />}
            >
              {t("winners")}
            </ButtonLink>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <CampaignStatus status={brief.status} />
            <span className="t-body-s font-mono text-fg-muted">
              {d("deadline", { date: brief.deadline })}
            </span>
          </div>
          <StepTrack
            progress={progress}
            labels={steps}
            label={brief.productName}
          />
        </div>

        {next ? (
          <section
            aria-labelledby="ugc-next"
            className="flex flex-col gap-3 rounded-lg border border-line border-l-2 border-l-fg p-4 sm:flex-row sm:items-center sm:justify-between md:p-5"
          >
            <div className="flex flex-col gap-1">
              <p id="ugc-next" className="t-label text-fg-muted">
                {d("nextTitle")}
              </p>
              <p className="font-medium">{d(`nextText.${next}`)}</p>
            </div>
            <ButtonLink
              href={
                next === "deposit"
                  ? `/billing/crypto?ugc=${id}`
                  : next === "decide"
                    ? "#ugc-videos"
                    : "#ugc-people"
              }
              variant="strong"
              className="self-start sm:self-auto"
            >
              {h(
                next === "deposit"
                  ? "nextDeposit"
                  : next === "hire"
                    ? "nextHire"
                    : next === "decide"
                      ? "nextDecide"
                      : "nextRemind",
              )}
            </ButtonLink>
          </section>
        ) : progress.step === "responses" || progress.step === "review" ? (
          <p className="t-body-s border-l-2 border-line-strong pl-3 text-fg-muted">
            {h("nextWait")}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-6 md:grid-cols-4">
          <Fact label={d("fact.reward")} value={money} />
          <Fact
            label={d("fact.videos")}
            value={d("hiredOf", {
              hired: progress.counts.hired,
              wanted: brief.videosWanted,
            })}
          />
          <Fact label={d("fact.budget")} value={budget} />
          <Fact
            label={d("fact.rights")}
            value={t(`rights.${brief.rights}`)}
            mono={false}
          />
          <Fact
            label={t("fields.platforms")}
            value={brief.platforms.map((p) => t(`platforms.${p}`)).join(", ")}
            mono={false}
          />
          <Fact
            label={t("fields.goal")}
            value={t(`goals.${brief.goal}`)}
            mono={false}
          />
          <Fact
            label={t("fields.languages")}
            value={brief.languages
              .map((code) => code.toUpperCase())
              .join(" · ")}
          />
          <Fact label={t("fields.country")} value={countries} />
        </dl>

        {deposit.required && (deposit.paid || brief.status === "open") ? (
          <section
            className="flex flex-col gap-3 rounded-lg border border-line p-4 md:p-5"
            aria-labelledby="ugc-deposit"
          >
            <h2 id="ugc-deposit" className="t-h3">
              {h("deposit.title")}
            </h2>
            <p className="t-body-s text-fg-muted">
              {deposit.paid
                ? h("deposit.paid", { total: budget })
                : h("deposit.needed", {
                    total: budget,
                    videos: brief.videosWanted,
                    price: money,
                  })}
            </p>
            {deposit.deposit?.status === "checking" ? (
              <p className="t-body-s" role="status">
                {h("deposit.checking")}
              </p>
            ) : null}
            {deposit.payable && next !== "deposit" ? (
              <ButtonLink
                href={`/billing/crypto?ugc=${id}`}
                variant="secondary"
                className="self-start"
              >
                {h("deposit.action", { total: budget })}
              </ButtonLink>
            ) : null}
          </section>
        ) : (
          <p className="t-body-s text-fg-muted">{t("moneyNote")}</p>
        )}

        <DeskSectionBlock
          id="ugc-people"
          title={d("peopleTitle")}
          aside={
            <span className="t-body-s font-mono text-fg-muted">
              {h("counts", {
                applied: progress.counts.applied,
                hired: progress.counts.hired,
                waiting: progress.counts.waiting,
              })}
            </span>
          }
        >
          {people.length === 0 ? (
            <DeskEmpty
              title={d("peopleEmpty")}
              text={
                brief.status === "open"
                  ? d("peopleEmptyOpen")
                  : d("peopleEmptyOther")
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
              {people.map((row) => {
                const name = row.creator?.displayName || t("creator");
                return (
                  <li
                    key={row.inviteId}
                    className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Monogram name={name} />
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="font-medium break-words">{name}</p>
                        {row.creator ? (
                          <p className="t-body-s break-words text-fg-muted">
                            {[
                              row.creator.platforms
                                .map((p) => t(`platforms.${p}`))
                                .join(", "),
                              row.creator.niches
                                .map((n) => t(`niches.${n}`))
                                .join(", "),
                              row.creator.languages
                                .map((code) => code.toUpperCase())
                                .join(" · "),
                            ]
                              .filter(Boolean)
                              .join(" — ")}
                          </p>
                        ) : null}
                        {row.status === "applied" && row.answers.length ? (
                          <dl className="t-body-s flex flex-col gap-1">
                            {row.answers.map((answer, n) => (
                              <div key={n}>
                                <dt className="text-fg-muted">
                                  {brief.questions[n]}
                                </dt>
                                <dd className="break-words">{answer}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                        {row.status === "declined" && row.declineReason ? (
                          <p className="t-body-s text-fg-muted">
                            {t(`declineReason.${row.declineReason}`)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      <ParticipationStatus status={row.status} />
                      {row.status === "applied" && row.shortlisted ? (
                        <span className="t-body-s font-mono">
                          {t("shortlisted")}
                        </span>
                      ) : null}
                      {row.status === "applied" ? (
                        <RejectApplication inviteId={row.inviteId} />
                      ) : null}
                      {row.status === "applied" ? (
                        <UgcAction
                          action="shortlist"
                          label={
                            row.shortlisted
                              ? t("shortlistRemove")
                              : t("shortlistAdd")
                          }
                          body={{
                            inviteId: row.inviteId,
                            on: !row.shortlisted,
                          }}
                        />
                      ) : null}
                      {row.status === "applied" && row.creator && offerOpen ? (
                        <UgcAction
                          action="offer"
                          label={t("offer")}
                          body={{
                            campaignId: id,
                            creatorId: row.creator.userId,
                          }}
                          primary
                        />
                      ) : null}
                      {(row.status === "offered" ||
                        (row.status === "hired" && !row.submission)) &&
                      row.reminders < 1 ? (
                        <UgcAction
                          action="remind"
                          label={t("remind")}
                          body={{ inviteId: row.inviteId }}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {people.some((row) => row.status === "applied") &&
          !offerOpen &&
          brief.status === "open" ? (
            <p className="t-body-s text-fg-muted">{d("offerAfterDeposit")}</p>
          ) : null}
        </DeskSectionBlock>

        <DeskSectionBlock id="ugc-videos" title={d("videosTitle")}>
          {videos.length === 0 ? (
            <DeskEmpty title={d("videosEmpty")} text={d("videosEmptyText")} />
          ) : (
            <ul className="flex flex-col gap-4">
              {videos.map((row) => (
                <VideoReviewItem
                  key={row.inviteId}
                  campaign={{ id, productName: brief.productName, brief }}
                  participant={row}
                  locale={locale}
                  showCampaign={false}
                />
              ))}
            </ul>
          )}
        </DeskSectionBlock>

        <DeskSectionBlock id="ugc-brief" title={d("briefTitle")}>
          <dl className="t-body-s grid gap-x-8 gap-y-4 md:grid-cols-2">
            <Fact
              label={t("fields.audience")}
              value={brief.audience}
              mono={false}
            />
            <Fact
              label={t("fields.pitch")}
              value={brief.pitch || "—"}
              mono={false}
            />
            <Fact
              label={t("fields.mustSay")}
              value={brief.mustSay}
              mono={false}
            />
            <Fact
              label={t("fields.mustNot")}
              value={brief.mustNot}
              mono={false}
            />
            {brief.exampleUrls.length > 0 ? (
              <Fact
                label={t("fields.examples")}
                mono={false}
                value={
                  <ul className="flex flex-col gap-1">
                    {brief.exampleUrls.map((url) => (
                      <li key={url} className="break-all">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-4"
                        >
                          {url}
                          <span className="sr-only">{d("newTab")}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                }
              />
            ) : null}
          </dl>
          {brief.status === "open" || brief.status === "paused" ? (
            <details className="group rounded-lg border border-line">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium md:px-5">
                {t("editTextTitle")}
              </summary>
              <div className="border-t border-line p-4 md:p-5">
                <BriefTextForm
                  campaignId={id}
                  initial={{
                    productSummary: brief.productSummary,
                    pitch: brief.pitch,
                    mustSay: brief.mustSay,
                    mustNot: brief.mustNot,
                    exampleUrls: brief.exampleUrls,
                    questions: brief.questions,
                  }}
                />
              </div>
            </details>
          ) : null}
        </DeskSectionBlock>

        {brief.status === "open" ||
        brief.status === "paused" ||
        brief.status === "pending_review" ? (
          <DeskSectionBlock id="ugc-manage" title={d("manageTitle")}>
            {brief.status === "open" ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="t-body-s max-w-[68ch] text-fg-muted">
                    {d("joinHint")}
                  </p>
                  <UgcAction
                    action="join"
                    label={t("join")}
                    body={{ campaignId: id }}
                  />
                </div>
                <div className="flex flex-wrap gap-3 border-t border-line pt-4">
                  <UgcAction
                    action="pause"
                    label={t("pause")}
                    body={{ campaignId: id }}
                  />
                  <UgcAction
                    action="close"
                    label={t("close")}
                    body={{ campaignId: id }}
                  />
                </div>
              </div>
            ) : null}
            {brief.status === "paused" ? (
              <div className="flex flex-col gap-2">
                <p className="t-body-s text-fg-muted">{t("pausedNote")}</p>
                <div className="flex flex-wrap gap-3">
                  <UgcAction
                    action="resume"
                    label={t("resume")}
                    body={{ campaignId: id }}
                  />
                  <UgcAction
                    action="close"
                    label={t("close")}
                    body={{ campaignId: id }}
                  />
                </div>
              </div>
            ) : null}
            {brief.status === "pending_review" ? (
              <div className="flex flex-col gap-2">
                <p className="t-body-s text-fg-muted">{t("withdrawNote")}</p>
                <UgcAction
                  action="withdraw"
                  label={t("withdraw")}
                  body={{ campaignId: id }}
                />
              </div>
            ) : null}
          </DeskSectionBlock>
        ) : null}
      </DeskShell>
    </RouteMessages>
  );
}
