import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { mapSuggestion, mapSuggestionInput } from "@/modules/admin/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const { skillId } = await readJson(request, mapSuggestionInput);
    const suggestion = await mapSuggestion(
      admin,
      id,
      skillId,
      clientIp(request.headers),
    );
    return Response.json({ suggestion });
  } catch (error) {
    return toErrorResponse(error);
  }
}
