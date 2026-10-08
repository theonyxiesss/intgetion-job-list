import { seatCap } from "@/lib/billing/seats";
import { requireUser } from "@/lib/auth-guards";
import { HttpError, toErrorResponse } from "@/lib/http";
import { findAuthUserByEmail, isPlaceholderEmail } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, userIdForAuthUid } from "@/modules/auth/service";
import { companyHasActiveTeam } from "@/modules/billing/service";
import {
  addCompanyMember,
  findMemberRole,
} from "@/modules/companies/service";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  context: { params: Promise<{ identifier: string }> },
) {
  try {
    const [{ identifier }, supabase] = await Promise.all([
      context.params,
      createSupabaseServerClient(),
    ]);
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const role = await findMemberRole(identifier, user.id);
    if (role !== "owner") throw new HttpError(403, "FORBIDDEN", "Only the owner can add teammates");
    const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL.test(email) || email.length > 200 || isPlaceholderEmail(email)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Enter the email of an existing account");
    }
    const authUser = await findAuthUserByEmail(email);
    const memberId = authUser ? await userIdForAuthUid(authUser.id) : null;
    if (!memberId) throw new HttpError(404, "NO_ACCOUNT", "No account uses this email");
    const cap = seatCap(await companyHasActiveTeam(identifier));
    const result = await addCompanyMember(identifier, memberId, cap);
    return Response.json({ result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
