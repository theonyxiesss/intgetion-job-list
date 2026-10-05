import { NextResponse } from "next/server";
import { adminSessionCookie, ADMIN_SESSION_COOKIE } from "@/admin/cookies";
import { isAdminHost } from "@/admin/host";
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
  noteAdminLoginFailure,
  storeRecoveryCodes,
  takeRecoveryCode,
} from "@/modules/admin-console/service";
import { getCurrentUser } from "@/modules/auth/service";

/** Confirms TOTP or a recovery code, then issues the admin session. */
export async function POST(request: Request) {
  try {
    const host = request.headers.get("host");
    if (!isAdminHost(host)) throw notFound();
    const body = (await request.json().catch(() => null)) as {
      code?: string;
      factorId?: string;
    } | null;
    const code = body?.code?.trim() ?? "";
    const factorId = body?.factorId?.trim() ?? "";
    const bound = bindSupabase(request);
    const user = await getCurrentUser(bound.supabase.auth);
    if (!user) throw unauthenticated();
    const member = await consoleMember(user.id);
    if (!member) throw notFound();
    const ip = clientIp(request.headers);
    const subjects = [user.id, ip];

    let confirmed = false;
    if (code.includes("-")) {
      confirmed = await takeRecoveryCode(user.id, code);
    } else if (factorId && code) {
      const challenge = await bound.supabase.auth.mfa.challenge({ factorId });
      if (!challenge.error && challenge.data) {
        const verified = await bound.supabase.auth.mfa.verify({
          factorId,
          challengeId: challenge.data.id,
          code,
        });
        confirmed = !verified.error;
      }
    }
    if (!confirmed) {
      await noteAdminLoginFailure(subjects);
      throw unauthenticated("Sign-in failed");
    }

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
      ip,
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
