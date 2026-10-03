import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { applyExternal } from "@/modules/ingestion/service";

/**
 * `POST /api/jobs/:id/apply-external` (D8): returns the original posting
 * URL. Guests get the link too; for a signed-in user the click is logged
 * as feedback once 4B provides user_job_feedback (D72).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    return Response.json(await applyExternal(id, user?.id ?? null));
  } catch (error) {
    return toErrorResponse(error);
  }
}
