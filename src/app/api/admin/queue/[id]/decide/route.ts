import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { decideInput, decideQueueItem } from "@/modules/moderation/service";

/** `POST /api/admin/queue/:id/decide` `{ decision, note }` (section 7). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, decideInput);
    return Response.json({
      item: await decideQueueItem(admin, id, input, clientIp(request.headers)),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
