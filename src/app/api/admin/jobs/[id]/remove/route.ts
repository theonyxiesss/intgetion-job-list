import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { removeJob, removeJobInput } from "@/modules/moderation/service";

/** `POST /api/admin/jobs/:id/remove` `{ reason }` (section 7). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const { reason } = await readJson(request, removeJobInput);
    return Response.json({
      job: await removeJob(admin, id, reason, clientIp(request.headers)),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
