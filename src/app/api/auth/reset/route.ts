import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emailSenderConfigured,
  senderFromEnv,
} from "@/modules/notifications/service";
import { requestPasswordReset, resetInput } from "@/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, resetInput);
    await enforceRateLimit("emailLink", input.email);
    const supabase = await createSupabaseServerClient();
    // Only our own letter when it can actually leave (D320).
    const sender = emailSenderConfigured() ? senderFromEnv() : null;
    await requestPasswordReset(
      supabase.auth,
      input,
      sender ? (message) => sender.send(message) : undefined,
    );
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
