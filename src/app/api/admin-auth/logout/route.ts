import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/admin/cookies";
import { isAdminHost } from "@/admin/host";
import { notFound, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { REQUEST_ID_HEADER } from "@/lib/request-id";
import {
  readLiveSession,
  revokeAdminSession,
} from "@/modules/admin-console/service";

export async function POST(request: Request) {
  try {
    const host = request.headers.get("host");
    if (!isAdminHost(host)) throw notFound();
    const jar = await cookies();
    const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
    if (token) {
      const live = await readLiveSession(token);
      if (live) {
        await revokeAdminSession({
          token,
          actorId: live.user.id,
          ip: clientIp(request.headers),
          requestId: request.headers.get(REQUEST_ID_HEADER),
        });
      }
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
