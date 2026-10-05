import { z } from "zod";
import {
  finishAdminAction,
  openAdminAction,
  requireAdminReason,
} from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { reasonInput, revealPerson } from "@/modules/admin-console/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("users.pii.read", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, reasonInput);
    requireAdminReason(input.reason);
    const contacts = await revealPerson(id);
    await finishAdminAction(request, admin, {
      action: "pii.read",
      entityType: "user",
      entityId: id,
      reason: input.reason,
    });
    return Response.json(contacts);
  } catch (error) {
    return toErrorResponse(error);
  }
}
