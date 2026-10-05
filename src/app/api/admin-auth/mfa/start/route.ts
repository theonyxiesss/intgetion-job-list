import { NextResponse } from "next/server";
import { isAdminHost } from "@/admin/host";
import { bindSupabase } from "@/admin/supabase-request";
import { notFound, toErrorResponse, unauthenticated } from "@/lib/http";
import { consoleMember } from "@/modules/admin-console/service";
import { getCurrentUser } from "@/modules/auth/service";

/** Starts TOTP enrollment or a challenge. No admin cookie until verify. */
export async function POST(request: Request) {
  try {
    if (!isAdminHost(request.headers.get("host"))) throw notFound();
    const bound = bindSupabase(request);
    const user = await getCurrentUser(bound.supabase.auth);
    if (!user) throw unauthenticated();
    const member = await consoleMember(user.id);
    if (!member) throw notFound();
    const listed = await bound.supabase.auth.mfa.listFactors();
    if (listed.error) throw unauthenticated();
    const verified = listed.data?.totp?.[0];
    if (verified) {
      return NextResponse.json({ mode: "challenge", factorId: verified.id });
    }
    const enrolled = await bound.supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "admin",
    });
    if (enrolled.error || !enrolled.data?.totp?.secret) throw unauthenticated();
    return NextResponse.json({
      mode: "enroll",
      factorId: enrolled.data.id,
      secret: enrolled.data.totp.secret,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
