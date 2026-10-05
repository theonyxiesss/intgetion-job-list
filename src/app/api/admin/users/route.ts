import { requireAdminPermission } from "@/admin/action";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listUsers, listUsersQuery } from "@/modules/admin/service";

export async function GET(request: Request) {
  try {
    await requireAdminPermission("users.read");
    return Response.json(await listUsers(readQuery(request, listUsersQuery)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
