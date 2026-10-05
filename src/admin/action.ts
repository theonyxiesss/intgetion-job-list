import { cookies, headers } from "next/headers";
import { adminSessionCookie, ADMIN_SESSION_COOKIE } from "@/admin/cookies";
import { adminHostOnly, isAdminHost } from "@/admin/host";
import { auditScope, type AdminPermission } from "@/admin/permissions";
import { stepUpFresh } from "@/admin/session-policy";
import { requireAdmin } from "@/lib/auth-guards";
import type { CurrentUser } from "@/modules/auth/service";
import {
  assertActionAllowed,
  authorizeAdmin,
  requestAuditContext,
  writeAdminAudit,
  type AdminAccess,
} from "@/modules/admin-console/service";

export type { AdminAccess };

async function legacyUser(host: string | null): Promise<CurrentUser | null> {
  if (isAdminHost(host)) return null;
  return requireAdmin();
}

/** Page and API gate. A missing right is 404. */
export async function requireAdminPermission(
  permission: AdminPermission,
): Promise<AdminAccess> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const jar = await cookies();
  return authorizeAdmin({
    host,
    permission,
    sessionToken: jar.get(ADMIN_SESSION_COOKIE)?.value ?? null,
    legacyUser: await legacyUser(host),
    hostOnly: adminHostOnly(),
  });
}

/**
 * Permission, then step-up for a dangerous action. The caller checks the
 * reason after it has read the body, then `finishAdminAction` writes the audit.
 */
export async function openAdminAction(
  permission: AdminPermission,
  dangerous = false,
): Promise<AdminAccess> {
  const access = await requireAdminPermission(permission);
  assertActionAllowed({
    allowed: true,
    dangerous,
    legacy: access.legacy,
    stepUpFresh: access.session
      ? stepUpFresh(access.session.lastStepUpAt, new Date())
      : false,
    reasonRequired: false,
  });
  return access;
}

export async function finishAdminAction(
  request: Request,
  access: AdminAccess,
  audit: {
    action: string;
    entityType: string;
    entityId?: string | null;
    diff?: Record<string, unknown> | null;
    reason?: string | null;
  },
): Promise<void> {
  const context = requestAuditContext(
    request,
    access.session?.deviceClass ?? null,
  );
  await writeAdminAudit({
    actorId: access.user.id,
    action: audit.action,
    entityType: audit.entityType,
    entityId: audit.entityId,
    diff: audit.diff,
    reason: audit.reason,
    ip: context.ip,
    requestId: context.requestId,
    deviceClass: context.deviceClass,
  });
}

export function requireAdminReason(reason: string | null | undefined): void {
  assertActionAllowed({
    allowed: true,
    dangerous: false,
    legacy: false,
    stepUpFresh: true,
    reasonRequired: true,
    reason,
  });
}

/** Own-row audit scope for moderator, support, and marketing on the admin host. */
export function scopedActorId(access: AdminAccess): string | undefined {
  if (access.legacy || !access.role) return undefined;
  return auditScope(access.role) === "own" ? access.user.id : undefined;
}

export { adminSessionCookie, ADMIN_SESSION_COOKIE };
