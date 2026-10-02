import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  requireCurrentUser,
  toMeDto,
  updateMe,
  updateMeInput,
} from "@/modules/auth/service";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    return Response.json(toMeDto(user));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireCurrentUser(supabase.auth);
    const input = await readJson(request, updateMeInput);
    return Response.json(toMeDto(await updateMe(user, input)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
