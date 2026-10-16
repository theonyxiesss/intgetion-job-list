import { notFound, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { conversationHistory, resumeConversation } from "@/modules/bot/service";
import { listMyInvites, readCampaign } from "@/modules/ugc/service";
import { routing } from "@/i18n/routing";
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
    const jobId = job && JOB_ID.test(job) ? job : undefined;
    const campaignId = campaign && JOB_ID.test(campaign) ? campaign : undefined;
    const inviteId = invite && JOB_ID.test(invite) ? invite : undefined;
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
        : from === "services" || from === "campaigns"
          ? from
          : undefined,
      campaignId,
      inviteId,
      productName,
      locale:
        locale && (routing.locales as readonly string[]).includes(locale)
          ? locale
          : "en",
    });
    const headers = new Headers({ "cache-control": "no-store" });
    if (token) headers.set("set-cookie", sessionCookie(token));
    return Response.json(
      {
        conversationId: conversation?.id ?? null,
        messages: conversation
          ? await conversationHistory(conversation.id)
          : [],
        draftOffer: offer,
        actions,
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
