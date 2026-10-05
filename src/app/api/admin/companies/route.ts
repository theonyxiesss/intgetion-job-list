import { requireAdminPermission } from "@/admin/action";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listCompanies, listCompaniesQuery } from "@/modules/admin/service";

export async function GET(request: Request) {
  try {
    await requireAdminPermission("companies.read");
    return Response.json(
      await listCompanies(readQuery(request, listCompaniesQuery)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
