import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { magicLinkInput, sendMagicLink } from "@/modules/auth/service";
import { beginEmailWait } from "@/modules/auth/service/email-wait";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, magicLinkInput);
    await enforceRateLimit("emailLink", input.email);
    const wait = await beginEmailWait("login", input.locale);
    const supabase = await createSupabaseServerClient();
    await sendMagicLink(supabase.auth, { ...input, wait });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
