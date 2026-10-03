import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { magicLinkInput, sendMagicLink } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, magicLinkInput);
    await enforceRateLimit("emailLink", input.email);
    const supabase = await createSupabaseServerClient();
    await sendMagicLink(supabase.auth, input);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
