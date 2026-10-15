import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { submitService } from "@/modules/freelance/service";

/** `POST /api/freelance/services/:id/submit` — draft to moderation (D447). */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const service = await submitService(user.id, id);
    return Response.json({ service: { id: service.id, status: service.status } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
