import { z } from "zod";
import {
  finishAdminAction,
  openAdminAction,
  requireAdminReason,
} from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { removeJob, removeJobInput } from "@/modules/moderation/service";

/** `POST /api/admin/jobs/:id/remove` `{ reason }` (section 7). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("jobs.remove", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const body = await request
      .clone()
      .json()
      .catch(() => null);
    const reason =
      body && typeof body === "object" && "reason" in body
        ? String((body as { reason?: unknown }).reason ?? "")
        : "";
    requireAdminReason(reason);
    const parsed = await readJson(request, removeJobInput);
    const job = await removeJob(
      admin.user,
      id,
      parsed.reason,
      clientIp(request.headers),
    );
    await finishAdminAction(request, admin, {
      action: "jobs.remove",
      entityType: "job",
      entityId: id,
      reason: parsed.reason,
    });
    return Response.json({ job });
  } catch (error) {
    return toErrorResponse(error);
  }
}
