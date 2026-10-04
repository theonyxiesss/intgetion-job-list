import { readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  requireCurrentUser,
  toMeDto,
  updateMe,
  updateMeInput,
  type CurrentUser,
  type MeContext,
} from "@/modules/auth/service";
import { hasCandidateProfile } from "@/modules/candidates/service";
import { getCompaniesForUser } from "@/modules/companies/service";
import { deleteAccountInput, deleteMyAccount } from "@/modules/privacy/service";

/** Gathers what other modules know about the user for `/api/me`. */
async function meContext(user: CurrentUser): Promise<MeContext> {
  const [companies, candidate] = await Promise.all([
    getCompaniesForUser(user.id),
    hasCandidateProfile(user.id),
  ]);
  return {
    companies: companies.map(({ id, name, role }) => ({ id, name, role })),
    hasCandidateProfile: candidate,
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

/**
 * `DELETE /api/me` `{ confirm: "DELETE" }` (D28): anonymise the account,
 * remove the auth user and end the session.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    await readJson(request, deleteAccountInput);
    const result = await deleteMyAccount(user, clientIp(request.headers));
    await supabase.auth.signOut().catch(() => undefined);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
