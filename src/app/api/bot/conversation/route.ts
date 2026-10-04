import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { conversationHistory, resumeConversation } from "@/modules/bot/service";
import { sessionToken } from "../session-cookie";

/** `GET /api/bot/conversation` — the current session's last 50 messages. */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    const userId = user && user.status === "active" ? user.id : null;
    const { conversation, offer } = await resumeConversation({
      userId,
      token: sessionToken(request),
    });
    return Response.json(
      {
        conversationId: conversation?.id ?? null,
        messages: conversation
          ? await conversationHistory(conversation.id)
          : [],
        draftOffer: offer,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
