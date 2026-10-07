import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, unlinkOAuthProvider } from "@/modules/auth/service";

const body = z.object({ provider: z.enum(["google", "x"]) });

/** Detaches Google or X from the signed-in account (D339). */
export async function POST(request: Request) {
  try {
    const input = await readJson(request, body);
    const supabase = await createSupabaseServerClient();
    await requireUser(() => getCurrentUser(supabase.auth));
    await unlinkOAuthProvider(supabase.auth, input.provider);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
