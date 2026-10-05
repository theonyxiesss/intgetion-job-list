import { requireUser } from "@/lib/auth-guards";
import { toErrorResponse } from "@/lib/http";
import { followCompany, unfollowCompany } from "@/modules/follows/service";

type Context = { params: Promise<{ identifier: string }> };

/** Follow a company by its slug (D239). */
export async function POST(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    await followCompany(user.id, (await context.params).identifier);
    return Response.json({ following: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    await unfollowCompany(user.id, (await context.params).identifier);
    return Response.json({ following: false });
  } catch (error) {
    return toErrorResponse(error);
  }
}
