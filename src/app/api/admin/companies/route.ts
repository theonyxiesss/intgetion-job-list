import { requireAdmin } from "@/lib/auth-guards";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listCompanies, listCompaniesQuery } from "@/modules/admin/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    return Response.json(
      await listCompanies(readQuery(request, listCompaniesQuery)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
