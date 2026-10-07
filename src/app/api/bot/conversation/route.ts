import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { conversationHistory, resumeConversation } from "@/modules/bot/service";
import { sessionCookie, sessionToken } from "../session-cookie";

/** `GET /api/bot/conversation` — the current session's last 50 messages. */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    const userId = user && user.status === "active" ? user.id : null;
    const { conversation, offer, token, actions } = await resumeConversation({
      userId,
      token: sessionToken(request),
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
