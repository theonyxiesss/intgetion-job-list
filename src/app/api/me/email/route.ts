import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { addEmailInput, requestEmailAdd } from "@/modules/auth/service";
import { senderFromEnv } from "@/modules/notifications/service";

/** A Telegram-only account asks to add an email; a link is mailed (D231). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, addEmailInput);
    await enforceRateLimit("emailLink", `add:${user.id}`);
    const sender = senderFromEnv();
    await requestEmailAdd(user, input, (message) => sender.send(message));
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
