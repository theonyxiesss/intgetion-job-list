import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "@/modules/auth/service";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await logout(supabase.auth);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
