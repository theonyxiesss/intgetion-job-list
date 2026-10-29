import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { leaveClientReview } from "@/modules/freelance/service";

/** `POST /api/freelance/client-reviews` `{ orderId, rating, body }` (TZ 46). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    const review = await leaveClientReview(user.id, body);
    return Response.json(
      { review: { id: review.id, rating: review.rating } },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
