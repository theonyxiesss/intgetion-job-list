import { requireAdmin } from "@/lib/auth-guards";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listUsers, listUsersQuery } from "@/modules/admin/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    return Response.json(await listUsers(readQuery(request, listUsersQuery)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
