import { z } from "zod";
import {
  finishAdminAction,
  openAdminAction,
  requireAdminReason,
} from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import {
  reasonInput,
  resetPersonPassword,
} from "@/modules/admin-console/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("users.reset_password", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, reasonInput);
    requireAdminReason(input.reason);
    const result = await resetPersonPassword(id);
    await finishAdminAction(request, admin, {
      action: "users.reset_password",
      entityType: "user",
      entityId: id,
      reason: input.reason,
      diff: { recovery: result.recovery },
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
