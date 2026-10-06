import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSessionHandoff, localeSchema } from "@/modules/auth/service";

const input = z.object({ locale: localeSchema });

/**
 * Hands this person's session to another browser (D316): the Mini App opens
 * the returned address outside Telegram, where the app can be installed and
 * the session is kept. Only ever for the caller's own account.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request, input);
    await enforceRateLimit("emailLink", `handoff:${user.id}`);
    const { url } = await createSessionHandoff(user, body.locale);
    return Response.json({ url });
  } catch (error) {
    return toErrorResponse(error);
  }
}
