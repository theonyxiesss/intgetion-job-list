import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import {
  freelanceReportInput,
  reportFreelance,
} from "@/modules/freelance/service";

/** `POST /api/freelance/services/:id/report` `{ reason, details? }` (28.9). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const input = await readJson(request, freelanceReportInput);
    // Rate limit after input validation, before the write (D26, P15).
    await enforceRateLimit("report", user.id);
    const result = await reportFreelance(
      user.id,
      { kind: "service", id },
      input,
      clientIp(request.headers),
    );
    return Response.json({ reportId: result.reportId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
