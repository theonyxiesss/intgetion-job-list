import { toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { recordAppliedExternal } from "@/modules/feedback/service";
import { applyExternal } from "@/modules/ingestion/service";

/**
 * `POST /api/jobs/:id/apply-external` (D8, D72): returns the original
 * posting URL. Guests get the link and no feedback row. A signed-in user
 * gets one `applied_external` row.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    return Response.json(
      await applyExternal(id, user?.id ?? null, recordAppliedExternal),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
