import { z } from "zod";
import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  confirmBriefDraft,
  patchBriefDraft,
  readBriefDraft,
  resetBriefDraft,
} from "@/modules/ugc/service";

const patchInput = z
  .object({
    draftId: z.uuid().optional(),
    companyId: z.uuid().optional(),
    patch: z.record(z.string(), z.unknown()),
    assumptions: z.array(z.string().max(300)).max(20).optional(),
  })
  .strict();
const actionInput = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("confirm"), draftId: z.uuid().optional() })
    .strict(),
  z
    .object({ action: z.literal("reset"), draftId: z.uuid().optional() })
    .strict(),
]);

async function currentUser() {
  const supabase = await createSupabaseServerClient();
  return requireUser(() => getCurrentUser(supabase.auth));
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    const draftId = new URL(request.url).searchParams.get("id") ?? undefined;
    return Response.json(await readBriefDraft(user.id, draftId), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    return Response.json(
      await patchBriefDraft(user.id, await readJson(request, patchInput)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const input = await readJson(request, actionInput);
    if (input.action === "reset")
      return Response.json(await resetBriefDraft(user.id, input.draftId));
    return Response.json(await confirmBriefDraft(user.id, input.draftId), {
      status: 201,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
