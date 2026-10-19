import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  confirmJobDraft,
  patchJobDraft,
  readJobDraft,
  resetJobDraft,
} from "@/modules/jobs/service";

const patchInput = z
  .object({
    draftId: z.uuid().optional(),
    patch: z.record(z.string(), z.unknown()),
  })
  .strict();
const actionInput = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("reset"), draftId: z.uuid().optional() })
    .strict(),
  z.object({ action: z.literal("confirm"), draftId: z.uuid() }).strict(),
]);

async function currentUser() {
  const supabase = await createSupabaseServerClient();
  return requireUser(() => getCurrentUser(supabase.auth));
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    const id = new URL(request.url).searchParams.get("id") ?? undefined;
    return Response.json(await readJobDraft(user.id, id), {
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
      await patchJobDraft(user.id, await readJson(request, patchInput)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const input = await readJson(request, actionInput);
    if (input.action === "reset")
      return Response.json(await resetJobDraft(user.id, input.draftId));
    const { data } = await supabase.auth.getUser();
    return Response.json(
      await confirmJobDraft(user.id, input.draftId, data.user?.email),
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
