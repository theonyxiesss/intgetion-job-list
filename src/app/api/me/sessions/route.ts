import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/modules/auth/service";

/**
 * `DELETE /api/me/sessions`: end every other session of this account; the
 * current device stays signed in (settings «Security and sign-in»).
 */
export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    await requireCurrentUser(supabase.auth);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) return Response.json({ ok: false }, { status: 502 });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
