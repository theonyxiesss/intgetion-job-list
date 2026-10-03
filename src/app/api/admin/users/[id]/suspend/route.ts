import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { suspendUser, userActionInput } from "@/modules/admin/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, userActionInput);
    const user = await suspendUser(admin, id, input, clientIp(request.headers));
    return Response.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
