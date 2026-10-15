import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { updateService } from "@/modules/freelance/service";

/** `PUT /api/freelance/services/:id` — edit own service (28.3). */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    const service = await updateService(user.id, id, body);
    return Response.json({
      service: { id: service.id, slug: service.slug, status: service.status },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
