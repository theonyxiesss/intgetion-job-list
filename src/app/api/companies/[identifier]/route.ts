import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toCompanyDto } from "@/modules/companies/api/dto";
import { patchCompanyInput } from "@/modules/companies/schemas";
import { editCompany, getPublicCompany } from "@/modules/companies/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ identifier: string }> },
) {
  try {
    const { identifier } = await context.params;
    const { company, jobs } = await getPublicCompany(identifier);
    return Response.json({ company: toCompanyDto(company), jobs });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ identifier: string }> },
) {
  try {
    const [{ identifier }, supabase] = await Promise.all([
      context.params,
      createSupabaseServerClient(),
    ]);
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const input = await readJson(request, patchCompanyInput);
    const company = await editCompany(identifier, user, input);
    return Response.json({ company: toCompanyDto(company) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
