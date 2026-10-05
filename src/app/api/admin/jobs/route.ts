import { requireAdminPermission } from "@/admin/action";
import { readQuery, toErrorResponse } from "@/lib/http";
import {
  listAdminJobs,
  listAdminJobsQuery,
} from "@/modules/moderation/service";

/** `GET /api/admin/jobs` — every source and status (section 7). */
export async function GET(request: Request) {
  try {
    await requireAdminPermission("jobs.read");
    return Response.json(
      await listAdminJobs(readQuery(request, listAdminJobsQuery)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
