import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { senderFromEnv } from "@/modules/notifications/service";
import { magicLinkInput, sendMagicLink } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, magicLinkInput);
    await enforceRateLimit("emailLink", input.email);
    const supabase = await createSupabaseServerClient();
    const sender = senderFromEnv();
    await sendMagicLink(supabase.auth, input, (message) =>
      sender.send(message),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
