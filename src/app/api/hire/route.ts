import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { hireInput } from "@/modules/jobs/schemas/hire";
import { submitHireListing } from "@/modules/jobs/service";

/** Hire form. The job waits for an admin; it is not published here (D391). */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const input = await readJson(request, hireInput);
    const { data } = await supabase.auth.getUser();
    const job = await submitHireListing(user, data.user?.email, input);
    return Response.json({ job: toJobDto(job) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
