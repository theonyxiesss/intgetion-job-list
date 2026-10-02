import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { changePassword, newPasswordInput } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, newPasswordInput);
    const supabase = await createSupabaseServerClient();
    await changePassword(supabase.auth, input);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
