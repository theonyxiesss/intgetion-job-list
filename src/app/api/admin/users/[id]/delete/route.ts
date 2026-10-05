import { z } from "zod";
import {
  finishAdminAction,
  openAdminAction,
  requireAdminReason,
} from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { reasonInput, requestFourEyes } from "@/modules/admin-console/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("users.delete", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, reasonInput);
    requireAdminReason(input.reason);
    const approval = await requestFourEyes({
      action: "users.delete",
      userId: id,
      reason: input.reason,
      actorId: admin.user.id,
    });
    await finishAdminAction(request, admin, {
      action: "users.delete.requested",
      entityType: "user",
      entityId: id,
      reason: input.reason,
      diff: { approvalId: approval.id },
    });
    return Response.json({ approval });
  } catch (error) {
    return toErrorResponse(error);
  }
}
