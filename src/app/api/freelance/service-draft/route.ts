import { z } from "zod";
import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import {
  confirmServiceBriefDraft,
  patchServiceBriefDraft,
  readServiceBriefDraft,
  resetServiceBriefDraft,
} from "@/modules/freelance/service";

const patchInput = z
  .object({
    draftId: z.uuid().optional(),
    patch: z.record(z.string(), z.unknown()),
    replacePackages: z.boolean().optional(),
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

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id") ?? undefined;
    return Response.json(await readServiceBriefDraft(user.id, id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    return Response.json(
      await patchServiceBriefDraft(
        user.id,
        await readJson(request, patchInput),
      ),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, actionInput);
    if (input.action === "reset")
      return Response.json(
        await resetServiceBriefDraft(user.id, input.draftId),
      );
    return Response.json(
      await confirmServiceBriefDraft(user.id, input.draftId),
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
