import { recordAudit } from "@/lib/audit";
import { HttpError, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteAuthUser, getAuthUserEmail } from "@/lib/supabase/admin";
import { purgeAnalytics } from "@/modules/analytics/service";
import type { CurrentUser } from "@/modules/auth/service";
import * as repo from "../repo/privacy-repo";

/** Version of the export format; bump when fields change (D165). */
export const EXPORT_VERSION = 1;

/**
 * `GET /api/me/export` (section 17): every row the platform stores about
 * the caller as one JSON document. The login email comes from Supabase
 * Auth; contacts are included because they are the user's own.
 */
export async function exportMyData(user: CurrentUser, now = new Date()) {
  await enforceRateLimit("dataExport", user.id, now);
  const [data, email] = await Promise.all([
    repo.readUserData(user.id),
    getAuthUserEmail(user.authUid),
  ]);
  await recordAudit({
    actorId: user.id,
    action: "user.data_exported",
    entityType: "user",
    entityId: user.id,
    diff: { version: EXPORT_VERSION },
  });
  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    email,
    ...data,
  };
}

/**
 * `DELETE /api/me` `{ confirm: "DELETE" }` (D28, P13). Soft delete with
 * immediate anonymisation in one transaction, then the auth user is
 * removed; if that call fails the retention cron retries it (D166).
 * Admins cannot delete themselves — another admin demotes them first.
 */
export async function deleteMyAccount(
  user: CurrentUser,
  ip: string | null,
  now = new Date(),
) {
  const row = await repo.findUserForDeletion(user.id);
  if (!row || row.status === "deleted") throw notFound();
  if (row.platform_role === "admin") {
    throw new HttpError(
      422,
      "ADMIN_PROTECTED",
      "An admin account cannot delete itself",
    );
  }
  const result = await repo.anonymizeUser(user.id, now);
  if (!result) throw notFound();
  const auth = await deleteAuthUser(row.auth_uid);
  await recordAudit({
    actorId: null,
    action: "user.deleted",
    entityType: "user",
    entityId: user.id,
    diff: {
      suspendedCompanies: result.companyIds.length,
      closedJobs: result.closedJobs,
      authUser: auth,
    },
    ip,
  });
  return { deleted: true as const, authUser: auth };
}

/** Days during which the cron retries a failed auth-user delete. */
export const AUTH_DELETE_RETRY_DAYS = 7;

/**
 * Daily `/api/cron/retention` (section 17). Rate-limit counters, import
 * runs and email queue rows have their own crons; bot tables join with 7A.
 */
export async function runRetention(now = new Date()) {
  const purged = await repo.purgeExpired(now);
  const analyticsEvents = await purgeAnalytics(now);
  const since = new Date(
    now.getTime() - AUTH_DELETE_RETRY_DAYS * 24 * 60 * 60 * 1000,
  );
  let authRetried = 0;
  for (const { auth_uid } of await repo.recentlyDeletedAuthUids(since)) {
    const result = await deleteAuthUser(auth_uid);
    if (result === "deleted") authRetried += 1;
    if (result === "failed") {
      logger.warn("retention: auth user delete still failing");
    }
  }
  return { ...purged, analyticsEvents, authRetried };
}
