import { readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botUiActionInput } from "@/modules/bot/schemas";
import { runUiAction } from "@/modules/bot/service";
import { sessionToken } from "../../session-cookie";

/**
 * `POST /api/bot/ui/action` `{ blockId, actionId }` — a button on a Spoki
 * block (D523) in the caller's own conversation. Guests by their bot
 * session (refresh only), users by account; writes need an account.
 */
export async function POST(request: Request) {
  try {
    const input = await readJson(request, botUiActionInput);
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    const userId = user && user.status === "active" ? user.id : null;
    const result = await runUiAction({
      userId,
      token: sessionToken(request),
      ip: clientIp(request.headers),
      blockId: input.blockId,
      actionId: input.actionId,
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
