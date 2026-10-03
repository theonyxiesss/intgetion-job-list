import type { memberRole } from "@/db/schema";
import { forbidden, notFound, unauthenticated } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, type CurrentUser } from "@/modules/auth/service";

/**
 * Guards (section 5.1). Each throws an HttpError; route handlers turn it into
 * the response. 404 hides objects the caller may not see; 403 is only for a
 * visible object whose action is not allowed.
 */

export type MemberRole = (typeof memberRole.enumValues)[number];

export type UserLoader = () => Promise<CurrentUser | null>;

/** Whether the user has a candidate profile. Wired by 2B (D38). */
export type CandidateLookup = (userId: string) => Promise<boolean>;

/** The user's role in the company, or null when not a member. Wired by 3A (D38). */
export type MembershipLookup = (
  companyId: string,
  userId: string,
) => Promise<MemberRole | null>;

async function loadSessionUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  return getCurrentUser(supabase.auth);
}

/** Signed in with a confirmed email and an active account, else 401. */
export async function requireUser(
  load: UserLoader = loadSessionUser,
): Promise<CurrentUser> {
  const user = await load();
  if (!user) throw unauthenticated();
  return user;
}

/** Platform admin (D21). Everyone else, guests included, gets 404. */
export async function requireAdmin(
  load: UserLoader = loadSessionUser,
): Promise<CurrentUser> {
  const user = await load();
  if (!user || user.platformRole !== "admin") throw notFound();
  return user;
}

/** Candidate side = has a candidate profile (1.3). No profile → 404. */
export async function requireCandidate(
  hasCandidateProfile: CandidateLookup,
  load: UserLoader = loadSessionUser,
): Promise<CurrentUser> {
  const user = await requireUser(load);
  if (!(await hasCandidateProfile(user.id))) throw notFound();
  return user;
}

/**
 * Member of the company with one of `roles` (D13). Not a member → 404, the
 * company is not "theirs"; a member without the role → 403.
 */
export async function requireMembership(
  companyId: string,
  roles: readonly MemberRole[],
  findRole: MembershipLookup,
  load: UserLoader = loadSessionUser,
): Promise<{ user: CurrentUser; role: MemberRole }> {
  const user = await requireUser(load);
  const role = await findRole(companyId, user.id);
  if (!role) throw notFound();
  if (!roles.includes(role)) throw forbidden();
  return { user, role };
}
