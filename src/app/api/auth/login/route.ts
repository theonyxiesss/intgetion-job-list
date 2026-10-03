import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auditSignIn, loginInput, signIn } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, loginInput);
    const ip = clientIp(request.headers);
    await enforceRateLimit("login", `${ip}|${input.email}`);
    const supabase = await createSupabaseServerClient();
    const user = await signIn(supabase.auth, input);
    await auditSignIn(user, "password", ip);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
