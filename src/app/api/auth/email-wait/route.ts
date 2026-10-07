import { toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auditSignIn, getCurrentUser } from "@/modules/auth/service";
import { claimEmailWait } from "@/modules/auth/service/email-wait";

/** Poll: signs the waiting PC in once the email link was opened elsewhere (D328). */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const result = await claimEmailWait(supabase.auth);
    if (result === "pending") {
      return Response.json({ pending: true }, { status: 202 });
    }
    if (result === "absent") {
      return Response.json({ ok: false });
    }
    const user = await getCurrentUser(supabase.auth);
    if (user) await auditSignIn(user, "email_link", clientIp(request.headers));
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
