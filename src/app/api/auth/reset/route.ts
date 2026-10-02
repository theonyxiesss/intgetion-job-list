import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestPasswordReset, resetInput } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, resetInput);
    const supabase = await createSupabaseServerClient();
    await requestPasswordReset(supabase.auth, input);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
