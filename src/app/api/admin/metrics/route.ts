import { requireAdminPermission } from "@/admin/action";
import { toErrorResponse } from "@/lib/http";
import { getMetrics } from "@/modules/metrics/service";

export async function GET() {
  try {
    await requireAdminPermission("analytics.read");
    return Response.json(await getMetrics());
  } catch (error) {
    return toErrorResponse(error);
  }
}
