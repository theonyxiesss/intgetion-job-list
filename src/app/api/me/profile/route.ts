import { readJson, toErrorResponse } from "@/lib/http";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/modules/auth/service";
import { applySharedBasics } from "@/modules/candidates/service";
import { applySharedEmployerName } from "@/modules/companies/service";
import { applySharedToCreator } from "@/modules/ugc/service";
import {
  readSharedProfile,
  sharedProfileInput,
  updateSharedProfile,
  type SharedProfile,
} from "@/modules/users/service";

/** `GET /api/me/profile`: the shared "about me" profile (D504). */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    return Response.json({ profile: await readSharedProfile(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * The shared profile reaches the roles that already exist. A role that is
 * not started yet takes it when the person starts it (prefilled form).
 */
async function applyToRoles(userId: string, profile: SharedProfile) {
  const steps: Promise<unknown>[] = [
    applySharedBasics(userId, {
      fullName: profile.displayName,
      country: profile.country,
      city: profile.city,
      timezone: profile.timezone,
    }),
    applySharedToCreator(userId, {
      country: profile.country,
      languages: profile.languages.map((item) => item.code),
    }),
  ];
  if (profile.displayName)
    steps.push(applySharedEmployerName(userId, profile.displayName));
  const results = await Promise.allSettled(steps);
  for (const result of results)
    if (result.status === "rejected")
      logger.warn({ err: result.reason }, "account: role not updated");
}

/** `PATCH /api/me/profile`: save the shared profile from the account page. */
export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    const input = await readJson(request, sharedProfileInput);
    const profile = await updateSharedProfile(user.id, input);
    await applyToRoles(user.id, profile);
    return Response.json({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
