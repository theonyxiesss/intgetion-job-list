import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { formatMinor } from "@/lib/money";
import type { UgcRights } from "@/config/ugc";
import type { WorkspaceParticipant } from "../service/workspace";
import { UgcAction } from "./action";
import { SubmissionStatus, VideoPreview } from "./desk";
import { UgcChanges } from "./fields";

/**
 * One handed-in video: big preview, who and which brief, what was reported,
 * and the company's one decision (27.4). The buttons call the same actions
 * as before; "winner" shows only where the rights allow it.
 */
export async function VideoReviewItem({
  campaign,
  participant,
  locale,
  showCampaign = true,
}: {
  campaign: { id: string; productName: string; brief: { rights: UgcRights } };
  participant: Pick<
    WorkspaceParticipant,
    | "inviteId"
    | "status"
    | "rights"
    | "revisionUsed"
    | "creator"
    | "submission"
    | "payout"
  >;
  locale: string;
  showCampaign?: boolean;
}) {
  const t = await getTranslations("ugc");
  const d = await getTranslations("ugcDesk");
  const submission = participant.submission;
  if (!submission) return null;
  const name = participant.creator?.displayName || t("creator");
  const rights = participant.rights ?? campaign.brief.rights;
  const deciding =
    participant.status === "hired" && submission.status === "submitted";
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-line p-4 sm:flex-row md:gap-6 md:p-5">
      <VideoPreview
        url={submission.url}
        hook={submission.hook}
        creatorName={name}
        size="lg"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <SubmissionStatus status={submission.status} />
          <p className="t-h3 break-words">{name}</p>
          {showCampaign ? (
            <Link
              href={`/campaigns/${campaign.id}#ugc-videos`}
              className="t-body-s break-words text-fg-muted underline-offset-4 hover:underline"
            >
              {campaign.productName}
            </Link>
          ) : null}
        </div>
        <dl className="t-body-s grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {submission.hook ? (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="t-label text-fg-muted">{t("fields.hook")}</dt>
              <dd className="break-words">{submission.hook}</dd>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <dt className="t-label text-fg-muted">{t("fields.rights")}</dt>
            <dd>{t(`rights.${rights}`)}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="t-label text-fg-muted">{t("fields.videoUrl")}</dt>
            <dd className="min-w-0">
              <a
                href={submission.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 break-all underline underline-offset-4"
              >
                {submission.url}
                <Icon icon={ExternalLink} size={16} />
                <span className="sr-only">{d("newTab")}</span>
              </a>
            </dd>
          </div>
          {submission.changeNote ? (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="t-label text-fg-muted">
                {t("fields.changeNote")}
              </dt>
              <dd className="break-words">{submission.changeNote}</dd>
            </div>
          ) : null}
          {submission.liveUrl ? (
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="t-label text-fg-muted">{t("fields.liveUrl")}</dt>
              <dd className="min-w-0">
                <a
                  href={submission.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all underline underline-offset-4"
                >
                  {submission.liveUrl}
                  <span className="sr-only">{d("newTab")}</span>
                </a>
              </dd>
            </div>
          ) : null}
          {submission.reportedViews != null ? (
            <div className="flex flex-col gap-1">
              <dt className="t-label text-fg-muted">{d("reportedLabel")}</dt>
              <dd className="font-mono">
                {t("reportedViews", { count: submission.reportedViews })}
              </dd>
            </div>
          ) : null}
        </dl>
        {participant.payout ? (
          <p className="t-body-s border-l-2 border-line-strong pl-3">
            {t(participant.payout.status === "paid" ? "paidNote" : "owedNote", {
              amount: formatMinor(
                BigInt(participant.payout.amountMinor),
                "USD",
                locale,
                { wholeWhenEven: true },
              ),
            })}
          </p>
        ) : null}
        {deciding ? (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="t-body-s text-fg-muted">{d("decideHint")}</p>
            {submission.reviewDueAt ? (
              <p className="t-body-s font-mono">
                {t("reviewDue", { date: submission.reviewDueAt.slice(0, 10) })}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <UgcAction
                action="decide"
                label={t("acceptVideo")}
                body={{ inviteId: participant.inviteId, to: "accepted" }}
                primary
              />
              {rights === "ads" || rights === "whitelist" ? (
                <UgcAction
                  action="decide"
                  label={t("winner")}
                  body={{ inviteId: participant.inviteId, to: "winner" }}
                />
              ) : null}
              <UgcAction
                action="decide"
                label={t("rejectVideo")}
                body={{ inviteId: participant.inviteId, to: "rejected" }}
              />
            </div>
            {participant.revisionUsed ? (
              <p className="t-body-s text-fg-muted">{d("revisionUsed")}</p>
            ) : (
              <UgcChanges inviteId={participant.inviteId} />
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}
