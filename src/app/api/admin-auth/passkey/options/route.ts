import { NextResponse } from "next/server";
import { hostOrigin, isAdminHost } from "@/admin/host";
import { bindSupabase } from "@/admin/supabase-request";
import { notFound, toErrorResponse, unauthenticated } from "@/lib/http";
import { consoleMember } from "@/modules/admin-console/service";
import { getCurrentUser } from "@/modules/auth/service";

function jsonSafe(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64url");
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value).toString("base64url");
  }
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        jsonSafe(item),
      ]),
    );
  }
  return value;
}

/** Passkey options from Supabase MFA (webauthn). The browser never calls Supabase. */
export async function POST(request: Request) {
  try {
    const host = request.headers.get("host");
    if (!isAdminHost(host) || !host) throw notFound();
    const bound = bindSupabase(request);
    const user = await getCurrentUser(bound.supabase.auth);
    if (!user) throw unauthenticated();
    if (!(await consoleMember(user.id))) throw notFound();
    const listed = await bound.supabase.auth.mfa.listFactors();
    if (listed.error) throw unauthenticated();
    let factorId = listed.data?.webauthn?.[0]?.id;
    if (!factorId) {
      const enrolled = await bound.supabase.auth.mfa.enroll({
        factorType: "webauthn",
        friendlyName: "admin-passkey",
      });
      if (enrolled.error || !enrolled.data) throw unauthenticated();
      factorId = enrolled.data.id;
    }
    const origin = hostOrigin(host);
    const challenge = await bound.supabase.auth.mfa.challenge({
      factorId,
      webauthn: { rpId: host.split(":")[0] ?? host, rpOrigins: [origin] },
    });
    if (
      challenge.error ||
      !challenge.data ||
      challenge.data.type !== "webauthn"
    ) {
      throw unauthenticated();
    }
    return NextResponse.json({
      factorId,
      challengeId: challenge.data.id,
      webauthn: jsonSafe(challenge.data.webauthn),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
