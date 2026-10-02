import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { register, registerInput } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, registerInput);
    const supabase = await createSupabaseServerClient();
    await register(supabase.auth, input);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
