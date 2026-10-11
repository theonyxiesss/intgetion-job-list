import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { conversationHistory, resumeConversation } from "@/modules/bot/service";
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
    const locale = url.searchParams.get("locale");
    const { conversation, offer, token, actions } = await resumeConversation({
      userId,
      token: sessionToken(request),
      jobId: job && JOB_ID.test(job) ? job : undefined,
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
