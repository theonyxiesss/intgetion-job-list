import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  requireCurrentUser,
  toMeDto,
  updateMe,
  updateMeInput,
  type CurrentUser,
  type MeContext,
} from "@/modules/auth/service";
import { getCompaniesForUser } from "@/modules/companies/service";

/** Gathers what other modules know about the user for `/api/me`. */
async function meContext(user: CurrentUser): Promise<MeContext> {
  const companies = await getCompaniesForUser(user.id);
  return {
    companies: companies.map(({ id, name, role }) => ({ id, name, role })),
    // Candidate profiles arrive with 2B (D37.6).
    hasCandidateProfile: false,
  };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    return Response.json(toMeDto(user, await meContext(user)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    const input = await readJson(request, updateMeInput);
    const updated = await updateMe(user, input);
    return Response.json(toMeDto(updated, await meContext(updated)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
