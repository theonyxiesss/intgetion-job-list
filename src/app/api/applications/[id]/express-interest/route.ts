import { toErrorResponse, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { expressInterest } from "@/modules/applications/service";
import { z } from "zod";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    return Response.json(await expressInterest(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
