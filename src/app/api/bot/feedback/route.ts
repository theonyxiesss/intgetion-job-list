import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botFeedbackInput } from "@/modules/bot/schemas";
import { rateAnswer } from "@/modules/bot/service";
import { sessionToken } from "../session-cookie";

/**
 * `POST /api/bot/feedback` `{ messageId, rating }` — 👍, 👎 or null on one
 * of Spoki's answers in the caller's own conversation (D514). Guests by
 * their bot session, users by account.
 */
export async function POST(request: Request) {
  try {
    const input = await readJson(request, botFeedbackInput);
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    const userId = user && user.status === "active" ? user.id : null;
    await enforceRateLimit("botFeedback", userId ?? clientIp(request.headers));
    await rateAnswer({
      userId,
      token: sessionToken(request),
      messageId: input.messageId,
      rating: input.rating,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
