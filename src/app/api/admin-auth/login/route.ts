import { NextResponse } from "next/server";
import { hostOrigin, isAdminHost } from "@/admin/host";
import { loginInput } from "@/modules/auth/schemas";
import { signIn } from "@/modules/auth/service";
import {
  assertAdminLoginOpen,
  consoleMember,
  countryOf,
  noteAdminLoginFailure,
} from "@/modules/admin-console/service";
import { toErrorResponse, unauthenticated } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { bindSupabase } from "@/admin/supabase-request";

const MIN_PASSWORD = 14;

/** Email and password only. The admin cookie is issued after the second factor. */
export async function POST(request: Request) {
  try {
    const host = request.headers.get("host");
    if (!isAdminHost(host)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Not found" } },
        { status: 404 },
      );
    }
    const parsed = loginInput.safeParse(await request.json().catch(() => null));
    const email = parsed.success ? parsed.data.email : "";
    const password = parsed.success ? parsed.data.password : "";
    const ip = clientIp(request.headers);
    const subjects = [
      ...new Set([email, ip].filter((subject) => subject.length > 0)),
    ];
    await assertAdminLoginOpen(subjects);
    if (!parsed.success || password.length < MIN_PASSWORD) {
      await noteAdminLoginFailure(subjects);
      throw unauthenticated("Sign-in failed");
    }
    const bound = bindSupabase(request);
    let user;
    try {
      user = await signIn(bound.supabase.auth, { email, password });
    } catch (error) {
      await noteAdminLoginFailure(subjects);
      throw error;
    }
    const member = await consoleMember(user.id);
    if (!member) {
      await bound.supabase.auth.signOut();
      await noteAdminLoginFailure(subjects);
      throw unauthenticated("Sign-in failed");
    }
    const response = NextResponse.json({
      next: "mfa",
      country: countryOf(request.headers),
      origin: host ? hostOrigin(host) : null,
    });
    return bound.apply(response);
  } catch (error) {
    return toErrorResponse(error);
  }
}
