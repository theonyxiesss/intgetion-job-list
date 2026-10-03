import { requireAdmin } from "@/lib/auth-guards";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listQueue, listQueueQuery } from "@/modules/moderation/service";

/** `GET /api/admin/queue` — pending items, oldest first (14.4). */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    return Response.json(await listQueue(readQuery(request, listQueueQuery)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
