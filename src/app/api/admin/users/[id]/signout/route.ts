import { z } from "zod";
import {
  finishAdminAction,
  openAdminAction,
  requireAdminReason,
} from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { reasonInput, signOutPerson } from "@/modules/admin-console/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("users.signout", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, reasonInput);
    requireAdminReason(input.reason);
    const result = await signOutPerson(id);
    await finishAdminAction(request, admin, {
      action: "users.signout",
      entityType: "user",
      entityId: id,
      reason: input.reason,
      diff: result,
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
