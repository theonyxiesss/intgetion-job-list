import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/modules/auth/service";
import {
  readSharedProfile,
  sharedProfileInput,
  updateSharedProfile,
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

/** `PATCH /api/me/profile`: save the shared profile from the account page. */
export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    const input = await readJson(request, sharedProfileInput);
    // Every role reads the shared profile itself (D509): nothing to copy.
    const profile = await updateSharedProfile(user.id, input);
    return Response.json({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
