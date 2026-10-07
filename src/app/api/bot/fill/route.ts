import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botFillModeInput } from "@/modules/bot/schemas";
import { findOwnConversation, setFillMode } from "@/modules/bot/service";
import { sessionToken } from "../session-cookie";

/** `POST /api/bot/fill` — fill the profile yourself, or let Spoki (D324). */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const input = await readJson(request, botFillModeInput);
    const conversation = await findOwnConversation(
      user.id,
      sessionToken(request),
    );
    if (!conversation) throw notFound();
    const result = await setFillMode(conversation, user.id, input.mode);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
