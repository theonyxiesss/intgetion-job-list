import { requireAdmin } from "@/lib/auth-guards";
import { readQuery, toErrorResponse } from "@/lib/http";
import {
  listAdminJobs,
  listAdminJobsQuery,
} from "@/modules/moderation/service";

/** `GET /api/admin/jobs` — every source and status (section 7). */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    return Response.json(
      await listAdminJobs(readQuery(request, listAdminJobsQuery)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
