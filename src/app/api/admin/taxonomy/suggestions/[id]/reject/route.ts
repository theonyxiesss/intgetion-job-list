import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { notFound, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { rejectSuggestion } from "@/modules/admin/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const suggestion = await rejectSuggestion(
      admin,
      id,
      clientIp(request.headers),
    );
    return Response.json({ suggestion });
  } catch (error) {
    return toErrorResponse(error);
  }
}
