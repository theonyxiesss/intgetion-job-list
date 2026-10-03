import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { requestVerificationInput } from "@/modules/companies/schemas";
import {
  getVerificationState,
  requestVerification,
} from "@/modules/companies/service";

async function owner(context: { params: Promise<{ identifier: string }> }) {
  const [{ identifier }, supabase] = await Promise.all([
    context.params,
    createSupabaseServerClient(),
  ]);
  const user = await requireUser(() => getCurrentUser(supabase.auth));
  if (!z.uuid().safeParse(identifier).success) throw notFound();
  return { user, companyId: identifier };
}

/** `GET /api/companies/:id/verification` — steps of 14.1 for the owner. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ identifier: string }> },
) {
  try {
    const { user, companyId } = await owner(context);
    return Response.json(await getVerificationState(user, companyId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `POST /api/companies/:id/verification` `{ method, target }` (10B). */
export async function POST(
  request: Request,
  context: { params: Promise<{ identifier: string }> },
) {
  try {
    const { user, companyId } = await owner(context);
    const input = await readJson(request, requestVerificationInput);
    return Response.json(await requestVerification(user, companyId, input), {
      status: 201,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
