import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
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
import { UgcChanges, UgcReport, UgcSubmit } from "@/modules/ugc/ui/fields";

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
  const steps = Object.fromEntries(
    UGC_STEPS.map((step) => [step, h(`steps.${step}`)]),
  ) as Record<(typeof UGC_STEPS)[number], string>;
  const deposit =
    view.role === "company" ? await campaignDepositState(user.id, id) : null;
  const progress =
    view.role === "company"
      ? campaignProgress(
          view.brief.status,
          countParticipants(
            view.participants,
            view.participants.flatMap((row) =>
              row.submission ? [row.submission] : [],
            ),
          ),
          { depositNeeded: Boolean(deposit?.required && !deposit.paid) },
        )
      : null;
  const budget = usdLabel(
    ugcBudgetMinor(view.brief.videosWanted, Number(view.brief.bountyMinor)),
  );
  return (
    <main className="py-10 md:py-16">
      <Container className="flex max-w-3xl flex-col gap-6">
        <PageHeader
          title={view.brief.productName}
          intro={view.brief.productSummary}
        />
        <p className="font-mono text-fg">
          {money} · {t(`status.${view.brief.status}`)} · {view.brief.deadline}
        </p>
        {progress ? (
          <div className="flex flex-col gap-2">
            <StepTrack
              progress={progress}
              labels={steps}
              label={view.brief.productName}
            />
            <p className="t-body-s font-mono text-fg-muted">
              {h("budget", { total: budget })}
              {" · "}
              {h("counts", {
                applied: progress.counts.applied,
                hired: progress.counts.hired,
                waiting: progress.counts.waiting,
              })}
            </p>
          </div>
        ) : null}
        {deposit?.required && (deposit.paid || view.brief.status === "open") ? (
          <section
            className="flex flex-col gap-3 rounded-lg border border-line p-4 md:p-5"
            aria-labelledby="ugc-deposit"
          >
            <h2 id="ugc-deposit" className="font-medium">
              {h("deposit.title")}
            </h2>
            <p className="t-body-s text-fg-muted">
              {deposit.paid
                ? h("deposit.paid", { total: budget })
                : h("deposit.needed", {
                    total: budget,
                    videos: view.brief.videosWanted,
                    price: money,
                  })}
            </p>
            {deposit.deposit?.status === "checking" ? (
              <p className="t-body-s" role="status">
                {h("deposit.checking")}
              </p>
            ) : null}
            {deposit.payable ? (
              <ButtonLink
                href={`/billing/crypto?ugc=${id}`}
                className="self-start"
              >
                {h("deposit.action", { total: budget })}
              </ButtonLink>
            ) : null}
          </section>
        ) : (
          <p className="t-body-s text-fg-muted">{t("moneyNote")}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <ButtonLink
            href={`/chat?campaign=${view.brief.id}`}
            variant="secondary"
          >
            {t("thread")}
          </ButtonLink>
          {view.role === "company" ? (
            <ButtonLink href={`/campaigns/${id}/winners`} variant="secondary">
              {t("winners")}
            </ButtonLink>
          ) : null}
        </div>
        {view.role === "company" ? (
          <div className="flex flex-col gap-4">
            {view.brief.status === "open" ? (
              <div className="flex flex-wrap gap-3">
                <UgcAction
                  action="join"
                  label={t("join")}
                  body={{ campaignId: id }}
                />
                <UgcAction
                  action="close"
                  label={t("close")}
                  body={{ campaignId: id }}
                />
              </div>
            ) : null}
            <ul className="flex flex-col gap-4">
              {view.participants.map((row) => (
                <li
                  key={row.inviteId}
                  className="rounded-lg border border-line p-4"
                >
                  <p className="font-medium">
                    {row.creator?.displayName ?? t("creator")}
                  </p>
                  <p className="t-body-s font-mono text-fg-muted">
                    {t(`status.${row.status}`)}
                  </p>
                  {row.status === "applied" && row.creator ? (
                    <UgcAction
                      action="offer"
                      label={t("offer")}
                      body={{ campaignId: id, creatorId: row.creator.userId }}
                      primary
                    />
                  ) : null}
                  {row.submission ? (
                    <p className="t-body-s mt-2 break-all">
                      {row.submission.url}
                    </p>
                  ) : null}
                  {row.submission?.liveUrl ? (
                    <p className="t-body-s mt-2 break-all">
                      {row.submission.liveUrl}
                    </p>
                  ) : null}
                  {row.submission?.reportedViews != null ? (
                    <p className="t-body-s mt-2 font-mono">
                      {t("reportedViews", {
                        count: row.submission.reportedViews,
                      })}
                    </p>
                  ) : null}
                  {row.payout ? (
                    <p className="t-body-s mt-2">
                      {t(
                        row.payout.status === "paid" ? "paidNote" : "owedNote",
                        {
                          amount: formatMinor(
                            BigInt(row.payout.amountMinor),
                            "USD",
                            locale,
                            { wholeWhenEven: true },
                          ),
                        },
                      )}
                    </p>
                  ) : null}
                  {row.status === "hired" &&
                  row.submission?.status === "submitted" ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <div className="flex flex-wrap gap-3">
                        <UgcAction
                          action="decide"
                          label={t("acceptVideo")}
                          body={{ inviteId: row.inviteId, to: "accepted" }}
                          primary
                        />
                        <UgcAction
                          action="decide"
                          label={t("rejectVideo")}
                          body={{ inviteId: row.inviteId, to: "rejected" }}
                        />
                        <UgcAction
                          action="decide"
                          label={t("winner")}
                          body={{ inviteId: row.inviteId, to: "winner" }}
                        />
                      </div>
                      {row.revisionUsed ? null : (
                        <UgcChanges inviteId={row.inviteId} />
                      )}
                    </div>
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
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-mono">{t(`status.${view.invite.status}`)}</p>
            {view.invite.status === "offered" ? (
              <div className="flex flex-wrap gap-3">
                <UgcAction
                  action="accept"
                  label={t("accept")}
                  body={{ inviteId: view.invite.id }}
                  primary
                />
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
                    {
                      wholeWhenEven: true,
                    },
                  ),
                })}
              </p>
            ) : null}
            <ButtonLink
              href={`/chat?invite=${view.invite.id}`}
              variant="secondary"
            >
              {t("thread")}
            </ButtonLink>
          </div>
        )}
      </Container>
    </main>
  );
}
