import { NextResponse } from "next/server";
import { adminSessionCookie, ADMIN_SESSION_COOKIE } from "@/admin/cookies";
import { hostOrigin, isAdminHost } from "@/admin/host";
import { bindSupabase } from "@/admin/supabase-request";
import { notFound, toErrorResponse, unauthenticated } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { REQUEST_ID_HEADER } from "@/lib/request-id";
import {
  consoleMember,
  countryOf,
  ensureMfaEnrolled,
  issueAdminSession,
  makeRecoveryCodes,
  needsRecoveryCodes,
  storeRecoveryCodes,
} from "@/modules/admin-console/service";
import { getCurrentUser } from "@/modules/auth/service";

/** Verifies a Supabase WebAuthn factor, then issues the admin session. */
export async function POST(request: Request) {
  try {
    const host = request.headers.get("host");
    if (!isAdminHost(host) || !host) throw notFound();
    const body = (await request.json().catch(() => null)) as {
      factorId?: string;
      challengeId?: string;
      type?: "create" | "request";
      credential?: unknown;
    } | null;
    if (
      !body?.factorId ||
      !body.challengeId ||
      !body.type ||
      !body.credential
    ) {
      throw unauthenticated();
    }
    const bound = bindSupabase(request);
    const user = await getCurrentUser(bound.supabase.auth);
    if (!user) throw unauthenticated();
    if (!(await consoleMember(user.id))) throw notFound();
    const origin = hostOrigin(host);
    const verified = await bound.supabase.auth.mfa.verify({
      factorId: body.factorId,
      challengeId: body.challengeId,
      webauthn: {
        rpId: host.split(":")[0] ?? host,
        rpOrigins: [origin],
        type: body.type,
        credential_response: body.credential as never,
      },
    });
    if (verified.error) throw unauthenticated();
    const now = new Date();
    await ensureMfaEnrolled(user.id, now);
    let recoveryCodes: string[] | undefined;
    if (await needsRecoveryCodes(user.id)) {
      recoveryCodes = makeRecoveryCodes();
      await storeRecoveryCodes(user.id, recoveryCodes);
    }
    const issued = await issueAdminSession({
      userId: user.id,
      userAgent: request.headers.get("user-agent"),
      country: countryOf(request.headers),
      ip: clientIp(request.headers),
      requestId: request.headers.get(REQUEST_ID_HEADER),
      now,
    });
    if (!issued.ok) throw notFound();
    await bound.supabase.auth.signOut();
    const response = NextResponse.json({
      ok: true,
      recoveryCodes: recoveryCodes ?? null,
    });
    bound.apply(response);
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      issued.token,
      adminSessionCookie,
    );
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
