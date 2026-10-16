import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botConfirmInput } from "@/modules/bot/schemas";
import {
  confirmAction,
  findConfirmationConversation,
  findOwnConversation,
} from "@/modules/bot/service";
import { sessionToken } from "../session-cookie";

/** `POST /api/bot/confirm` — users only (P8, P11). */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const input = await readJson(request, botConfirmInput);
    // A card shown in Telegram is answered here; it stays bound to its thread.
    const conversation =
      (await findConfirmationConversation(user.id, input.confirmationId)) ??
      (await findOwnConversation(user.id, sessionToken(request)));
    if (!conversation) throw notFound();
    const result = await confirmAction({
      userId: user.id,
      conversation,
      confirmationId: input.confirmationId,
      accept: input.accept,
      fields: input.fields,
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
