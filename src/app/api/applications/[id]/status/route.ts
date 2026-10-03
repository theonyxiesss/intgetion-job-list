import { readJson, toErrorResponse, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import {
  patchApplicationStatus,
  patchApplicationStatusInput,
} from "@/modules/applications/service";
import { z } from "zod";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, patchApplicationStatusInput);
    return Response.json(await patchApplicationStatus(user.id, id, input.to));
  } catch (error) {
    return toErrorResponse(error);
  }
}
