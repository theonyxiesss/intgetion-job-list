import { z } from "zod";
import { readJson, toErrorResponse, HttpError } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  isMissingEngagementTable,
  limitEngagementBrief,
  saveEngagementBrief,
} from "@/modules/companies/service";

const body = z.object({
  task: z.string().max(4000),
  reply: z.string().max(200),
  organization: z.string().max(120).optional(),
  budget: z.string().max(80).optional(),
  duration: z.string().max(80).optional(),
  start: z.string().max(80).optional(),
  website: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    await limitEngagementBrief(clientIp(request.headers));
    const input = await readJson(request, body);
    if (input.website?.trim()) return Response.json({ ok: true });
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      userId = (await getCurrentUser(supabase.auth))?.id ?? null;
    } catch {
      userId = null;
    }
    const saved = await saveEngagementBrief({
      userId,
      task: input.task,
      reply: input.reply,
      organization: input.organization ?? null,
      budget: input.budget ?? null,
      duration: input.duration ?? null,
      start: input.start ?? null,
    });
    if (!saved.ok) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid input", {
        field: saved.field,
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (isMissingEngagementTable(error)) {
      return toErrorResponse(
        new HttpError(503, "UNAVAILABLE", "Briefs are not stored yet"),
      );
    }
    return toErrorResponse(error);
  }
}
