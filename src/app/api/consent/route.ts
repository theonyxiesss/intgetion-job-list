import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { hasSessionMark } from "@/lib/supabase/session-mark";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  consentInput,
  recordConsent,
  storedConsent,
} from "@/modules/privacy/service";

export const dynamic = "force-dynamic";

async function currentUserId(request: Request): Promise<string | null> {
  // Guests skip the auth round trip entirely.
  if (!hasSessionMark(request.headers)) return null;
  const supabase = await createSupabaseServerClient();
  return (await getCurrentUser(supabase.auth))?.id ?? null;
}

/** The signed-in user's choice under the current policy, for a new device (D220). */
export async function GET(request: Request) {
  try {
    const userId = await currentUserId(request);
    const consent = userId ? await storedConsent(userId) : null;
    return Response.json(
      { consent },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Journals one choice from the banner or settings (D220). */
export async function POST(request: Request) {
  try {
    const body = await readJson(request, consentInput);
    const ip = clientIp(request.headers);
    await enforceRateLimit("consent", ip);
    const consent = await recordConsent({
      body,
      userId: await currentUserId(request),
      gpc: request.headers.get("sec-gpc") === "1",
      ip,
    });
    return Response.json({ consent });
  } catch (error) {
    return toErrorResponse(error);
  }
}
