import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reportJobForUser } from "@/modules/feedback/service";
import { reportJobInput } from "@/modules/feedback/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const { id } = await context.params;
    const input = await readJson(request, reportJobInput);
    // Rate limit after input validation, before the write (D26, P15).
    await enforceRateLimit("report", user.id);
    const result = await reportJobForUser(user.id, id, input);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
