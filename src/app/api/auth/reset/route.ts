import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { senderFromEnv } from "@/modules/notifications/service";
import { requestPasswordReset, resetInput } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, resetInput);
    await enforceRateLimit("emailLink", input.email);
    const supabase = await createSupabaseServerClient();
    const sender = senderFromEnv();
    // Our letter, our domain, our template (D320).
    await requestPasswordReset(supabase.auth, input, (message) =>
      sender.send(message),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
