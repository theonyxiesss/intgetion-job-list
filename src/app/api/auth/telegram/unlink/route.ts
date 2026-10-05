import { requireUser } from "@/lib/auth-guards";
import { toErrorResponse } from "@/lib/http";
import { unlinkTelegram } from "@/modules/auth/service";

/** Removes the Telegram sign-in when the account has a real email (D230). */
export async function POST() {
  try {
    await unlinkTelegram(await requireUser());
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
