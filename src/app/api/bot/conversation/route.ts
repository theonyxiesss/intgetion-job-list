import { notFound, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  chatActions,
  conversationHistory,
  findConfirmationConversation,
  offerUgcNextStep,
  pendingConfirmations,
  readFreelanceFocus,
  resumeConversation,
  type BotState,
} from "@/modules/bot/service";
import {
  listMyInvites,
  readCampaign,
  ugcNextStep,
} from "@/modules/ugc/service";
import { routing } from "@/i18n/routing";
import { readBriefDraft } from "@/modules/ugc/service";
import { readServiceBriefDraft } from "@/modules/freelance/service";
import { getJobForPublic, readJobDraft } from "@/modules/jobs/service";
import { sessionCookie, sessionToken } from "../session-cookie";

const JOB_ID = /^[0-9a-f-]{36}$/i;

/** `GET /api/bot/conversation` — the current session's last 50 messages. */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    const userId = user && user.status === "active" ? user.id : null;
    const url = new URL(request.url);
    const job = url.searchParams.get("job");
    const from = url.searchParams.get("from");
    const campaign = url.searchParams.get("campaign");
    const invite = url.searchParams.get("invite");
    const locale = url.searchParams.get("locale");
    const service = url.searchParams.get("service");
    const order = url.searchParams.get("order");
    const jobId = job && JOB_ID.test(job) ? job : undefined;
    const campaignId = campaign && JOB_ID.test(campaign) ? campaign : undefined;
    const inviteId = invite && JOB_ID.test(invite) ? invite : undefined;
    const confirm = url.searchParams.get("confirm");
    if (userId && confirm && JOB_ID.test(confirm)) {
      // A card shown in Telegram: show its own thread, cookie unchanged (D460).
      const thread = await findConfirmationConversation(userId, confirm);
      if (thread) {
        return Response.json(
          {
            conversationId: thread.id,
            messages: await conversationHistory(thread.id),
            draftOffer: null,
            pending: await pendingConfirmations(thread.id, userId),
            actions: chatActions(userId, (thread.state ?? {}) as BotState),
          },
          { headers: { "cache-control": "no-store" } },
        );
      }
    }
    const serviceId = service && JOB_ID.test(service) ? service : undefined;
    const orderId = order && JOB_ID.test(order) ? order : undefined;
    const freelance =
      !jobId && !campaignId && !inviteId && (serviceId || orderId)
        ? await readFreelanceFocus(userId, { serviceId, orderId })
        : null;
    let productName: string | undefined;
    if (userId && (campaignId || inviteId)) {
      const resolved = await briefIdForThread(userId, campaignId, inviteId);
      productName = (await readCampaign(userId, resolved)).brief.productName;
    }
    const { conversation, offer, token, actions } = await resumeConversation({
      userId,
      token: sessionToken(request),
      jobId,
      from: jobId
        ? undefined
        : from === "services" ||
            from === "campaigns" ||
            from === "freelance_sell" ||
            from === "post_job"
          ? from
          : undefined,
      campaignId,
      inviteId,
      productName,
      freelance,
      locale:
        locale && (routing.locales as readonly string[]).includes(locale)
          ? locale
          : "en",
    });
    const briefDraft =
      userId && from === "campaigns"
        ? await readBriefDraft(userId).catch(() => null)
        : null;
    const freelanceDraft =
      userId && from === "freelance_sell"
        ? await readServiceBriefDraft(userId).catch(() => null)
        : null;
    const jobDraft =
      userId && from === "post_job"
        ? await readJobDraft(userId).catch(() => null)
        : null;
    // Spoki offers the one next step of this brief or invite (D467).
    const next =
      conversation && userId && (campaignId || inviteId)
        ? await offerUgcNextStep({
            conversation,
            userId,
            locale: conversation.locale ?? "en",
            step: await ugcNextStep(userId, { campaignId, inviteId }),
          })
        : null;
    // What the thread is about, so the Spoki panel can say it without the
    // `/chat` page's own lookups (D525): the vacancy of the thread itself.
    const focusJobId = conversation?.jobId ?? jobId;
    const focusJob = focusJobId
      ? await getJobForPublic(focusJobId, {
          locale: conversation?.locale ?? "en",
        }).catch(() => null)
      : null;
    const focus = {
      ...(focusJob
        ? {
            job: {
              id: focusJob.id,
              title: focusJob.title,
              company: focusJob.company.name,
            },
          }
        : {}),
      ...(productName ? { ugcProduct: productName } : {}),
      ...(freelance?.title ? { freelanceTitle: freelance.title } : {}),
    };
    const headers = new Headers({ "cache-control": "no-store" });
    if (token) headers.set("set-cookie", sessionCookie(token));
    return Response.json(
      {
        conversationId: conversation?.id ?? null,
        messages: conversation
          ? await conversationHistory(conversation.id)
          : [],
        draftOffer: offer,
        pending: conversation
          ? await pendingConfirmations(conversation.id, userId)
          : [],
        actions,
        focus,
        next,
        briefDraft,
        freelanceDraft,
        jobDraft,
      },
      { headers },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function briefIdForThread(
  userId: string,
  campaignId: string | undefined,
  inviteId: string | undefined,
) {
  if (campaignId) return campaignId;
  const rows = await listMyInvites(userId);
  const row = rows.find((item) => item.inviteId === inviteId);
  if (!row) throw notFound();
  return row.campaignId;
}
