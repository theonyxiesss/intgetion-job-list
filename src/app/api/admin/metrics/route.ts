import { requireAdmin } from "@/lib/auth-guards";
import { toErrorResponse } from "@/lib/http";
import { getMetrics } from "@/modules/metrics/service";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await getMetrics());
  } catch (error) {
    return toErrorResponse(error);
  }
}
