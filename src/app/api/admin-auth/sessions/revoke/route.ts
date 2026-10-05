import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/admin/cookies";
import { isAdminHost } from "@/admin/host";
import { notFound, toErrorResponse, unauthenticated } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { REQUEST_ID_HEADER } from "@/lib/request-id";
import {
  readLiveSession,
  revokeSessionById,
} from "@/modules/admin-console/service";

export async function POST(request: Request) {
  try {
    if (!isAdminHost(request.headers.get("host"))) throw notFound();
    const jar = await cookies();
    const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) throw unauthenticated();
    const live = await readLiveSession(token);
    if (!live) throw unauthenticated();
    const body = (await request.json().catch(() => null)) as {
      id?: string;
    } | null;
    const id = body?.id ?? "";
    const revoked = await revokeSessionById({
      sessionId: id,
      actorId: live.user.id,
      ip: clientIp(request.headers),
      requestId: request.headers.get(REQUEST_ID_HEADER),
    });
    if (!revoked) throw notFound();
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
