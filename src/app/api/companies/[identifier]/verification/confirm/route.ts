import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { confirmVerificationInput } from "@/modules/companies/schemas";
import { confirmVerification } from "@/modules/companies/service";

/** `POST /api/companies/:id/verification/confirm` `{ token }` (10B). */
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
    if (!z.uuid().safeParse(identifier).success) throw notFound();
    const { token } = await readJson(request, confirmVerificationInput);
    return Response.json(await confirmVerification(user, identifier, token));
  } catch (error) {
    return toErrorResponse(error);
  }
}
