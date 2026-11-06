import { toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/modules/auth/service";
import {
  listMyConversations,
  startNewConversation,
} from "@/modules/bot/service";
import { sessionCookie, sessionToken } from "../session-cookie";

async function activeUserId() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  return user && user.status === "active" ? user.id : null;
}

/** `GET /api/bot/conversations` — the chat home's dialogues (TZ 53). */
export async function GET(request: Request) {
  try {
    const conversations = await listMyConversations({
      userId: await activeUserId(),
      token: sessionToken(request),
    });
    return Response.json(
      { conversations },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `POST /api/bot/conversations` — "New conversation": a fresh thread. */
export async function POST(request: Request) {
  try {
    await enforceRateLimit("botUiAction", clientIp(request.headers));
    const url = new URL(request.url);
    const asked = url.searchParams.get("locale");
    const locale = routing.locales.includes(asked as never)
      ? (asked as string)
      : routing.defaultLocale;
    const { id, token } = await startNewConversation({
      userId: await activeUserId(),
      locale,
    });
    return Response.json(
      { conversationId: id },
      {
        status: 201,
        headers: {
          "set-cookie": sessionCookie(token),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
