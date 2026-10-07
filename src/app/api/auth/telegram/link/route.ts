import { requireUser } from "@/lib/auth-guards";
import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { finishTelegramBotLink, getCurrentUser } from "@/modules/auth/service";

/**
 * Poll: links Telegram once the bot tap has confirmed this browser's cookie.
 * The signed-in session stays the same (D339).
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const result = await finishTelegramBotLink(user);
    if (result === "pending") {
      return Response.json({ pending: true }, { status: 202 });
    }
    if (result === "absent") {
      return Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign-in failed" } },
        { status: 401 },
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
