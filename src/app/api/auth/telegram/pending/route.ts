import { toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  auditSignIn,
  finishTelegramBotLogin,
  getCurrentUser,
} from "@/modules/auth/service";

/** Poll: signs in once the bot tap has confirmed this browser's cookie (D219). */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const result = await finishTelegramBotLogin(supabase.auth);
    if (result === "pending") {
      return Response.json({ pending: true }, { status: 202 });
    }
    if (result === "absent") {
      return Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign-in failed" } },
        { status: 401 },
      );
    }
    const user = await getCurrentUser(supabase.auth);
    if (user) await auditSignIn(user, "telegram", clientIp(request.headers));
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
