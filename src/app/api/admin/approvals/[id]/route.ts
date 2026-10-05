import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import {
  approvalOf,
  decideFourEyes,
  decisionInput,
} from "@/modules/admin-console/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const row = await approvalOf(id);
    const permission =
      row.action === "users.delete" ? "users.delete" : "users.ban";
    const admin = await openAdminAction(permission, true);
    const input = await readJson(request, decisionInput);
    const result = await decideFourEyes({
      approvalId: id,
      actorId: admin.user.id,
      decision: input.decision,
      ip: clientIp(request.headers),
    });
    await finishAdminAction(request, admin, {
      action:
        result.decision === "approved"
          ? result.action
          : `${result.action}.rejected`,
      entityType: "user",
      entityId: result.userId,
      reason: String(row.reason),
      diff: { approvalId: id, decision: result.decision },
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
