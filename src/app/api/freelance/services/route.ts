import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createService } from "@/modules/freelance/service";

/** `POST /api/freelance/services` — a new draft (28.3). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    const service = await createService(user.id, body);
    return Response.json(
      { service: { id: service.id, slug: service.slug, status: service.status } },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
