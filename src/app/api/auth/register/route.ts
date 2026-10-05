import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/modules/analytics/service";
import { register, registerInput } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, registerInput);
    await enforceRateLimit("register", clientIp(request.headers));
    // Without a password registration sends a magic link.
    if (!input.password) await enforceRateLimit("emailLink", input.email);
    const supabase = await createSupabaseServerClient();
    await register(supabase.auth, input);
    await trackServerEvent(request, "signup");
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
