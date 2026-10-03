import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toCompanyDto } from "@/modules/companies/api/dto";
import { createCompanyInput } from "@/modules/companies/schemas";
import { createCompany } from "@/modules/companies/service";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const input = await readJson(request, createCompanyInput);
    const company = await createCompany(user, input);
    return Response.json({ company: toCompanyDto(company) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
