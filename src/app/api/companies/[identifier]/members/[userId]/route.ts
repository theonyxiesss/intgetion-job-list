import { requireUser } from "@/lib/auth-guards";
import { HttpError, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  findMemberRole,
  removeCompanyMember,
} from "@/modules/companies/service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ identifier: string; userId: string }> },
) {
  try {
    const [{ identifier, userId }, supabase] = await Promise.all([
      context.params,
      createSupabaseServerClient(),
    ]);
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const role = await findMemberRole(identifier, user.id);
    if (role !== "owner") {
      throw new HttpError(403, "FORBIDDEN", "Only the owner can remove teammates");
    }
    await removeCompanyMember(identifier, userId);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
