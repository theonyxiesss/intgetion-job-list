import { requireAdmin } from "@/lib/auth-guards";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listReports, listReportsQuery } from "@/modules/moderation/service";

/** `GET /api/admin/reports` — open reports, oldest first (14.5). */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    return Response.json(
      await listReports(readQuery(request, listReportsQuery)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
