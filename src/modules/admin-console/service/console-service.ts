import { randomBytes } from "node:crypto";
import { evaluateAdminAction } from "@/admin/action-policy";
import { isAdminHost } from "@/admin/host";
import {
  can,
  isAdminRole,
  type AdminPermission,
  type AdminRole,
} from "@/admin/permissions";
import {
  countryFromHeader,
  deviceClassOf,
  sessionAlive,
} from "@/admin/session-policy";
import { recordAudit } from "@/lib/audit";
import { HttpError, errorCodes, notFound } from "@/lib/http";
import { privacyHash } from "@/lib/privacy-hash";
import { clientIp } from "@/lib/request-ip";
import { REQUEST_ID_HEADER } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getAuthUserEmail } from "@/lib/supabase/admin";
import {
  hit,
  rateRules,
  retryAfterSeconds,
  windowCount,
} from "@/lib/rate-limit";
import { rateLimited } from "@/lib/http";
import type { CurrentUser } from "@/modules/auth/service";
import * as repo from "../repo/admin-console-repo";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type LiveAdminSession = {
  session: repo.SessionRow;
  role: AdminRole;
  user: CurrentUser;
};

export type IssueResult =
  | { ok: true; token: string }
  | { ok: false; reason: "not_member" | "disabled" | "mfa_required" };

export function hashAdminToken(token: string): string {
  return privacyHash(token);
}

export async function issueAdminSession(input: {
  userId: string;
  userAgent: string | null;
  country: string | null;
  ip: string | null;
  requestId: string | null;
  now?: Date;
}): Promise<IssueResult> {
  const member = await repo.findMember(input.userId);
  if (!member || !isAdminRole(member.role))
    return { ok: false, reason: "not_member" };
  if (member.disabledAt) return { ok: false, reason: "disabled" };
  if (!member.mfaEnrolledAt) return { ok: false, reason: "mfa_required" };

  const now = input.now ?? new Date();
  const deviceClass = deviceClassOf(input.userAgent);
  const seen = await repo.hasSeenDevice(
    input.userId,
    deviceClass,
    input.country,
  );
  const token = randomBytes(32).toString("base64url");
  await repo.insertSession({
    userId: input.userId,
    tokenHash: hashAdminToken(token),
    deviceClass,
    country: input.country,
    now,
  });
  await recordAudit({
    actorId: input.userId,
    action: "admin.login",
    entityType: "user",
    entityId: input.userId,
    diff: { deviceClass, country: input.country },
    ip: input.ip,
    requestId: input.requestId,
    deviceClass,
  });
  if (!seen) {
    void notifyNewDevice(input.userId, deviceClass, input.country).catch(
      (error) => {
        logger.warn({ err: error }, "admin new-device mail failed");
      },
    );
  }
  return { ok: true, token };
}

export async function readLiveSession(
  token: string | null | undefined,
  now: Date = new Date(),
): Promise<LiveAdminSession | null> {
  if (!token) return null;
  const row = await repo.findSessionByHash(hashAdminToken(token));
  if (!row || row.revokedAt) return null;
  if (!sessionAlive(row.createdAt, row.lastSeenAt, now)) {
    await repo.revokeSession(row.id, now);
    return null;
  }
  const member = await repo.findMember(row.userId);
  if (
    !member ||
    member.disabledAt ||
    !member.mfaEnrolledAt ||
    !isAdminRole(member.role)
  ) {
    return null;
  }
  const user = await repo.findUserRow(row.userId);
  if (!user || user.status !== "active") return null;
  await repo.touchSession(row.id, now);
  return { session: row, role: member.role, user };
}

export async function revokeAdminSession(input: {
  token: string;
  actorId: string;
  ip: string | null;
  requestId: string | null;
  now?: Date;
}): Promise<boolean> {
  const row = await repo.findSessionByHash(hashAdminToken(input.token));
  if (!row || row.revokedAt || row.userId !== input.actorId) return false;
  const now = input.now ?? new Date();
  await repo.revokeSession(row.id, now);
  await recordAudit({
    actorId: input.actorId,
    action: "admin.logout",
    entityType: "user",
    entityId: input.actorId,
    ip: input.ip,
    requestId: input.requestId,
    deviceClass: row.deviceClass,
  });
  return true;
}

export async function revokeSessionById(input: {
  sessionId: string;
  actorId: string;
  ip: string | null;
  requestId: string | null;
}): Promise<boolean> {
  const rows = await repo.listLiveSessions(input.actorId);
  const row = rows.find((item) => item.id === input.sessionId);
  if (!row) return false;
  await repo.revokeSession(row.id, new Date());
  await recordAudit({
    actorId: input.actorId,
    action: "admin.logout",
    entityType: "admin_session",
    entityId: row.id,
    ip: input.ip,
    requestId: input.requestId,
    deviceClass: row.deviceClass,
  });
  return true;
}

export function makeRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(8);
    const chars = [...bytes]
      .map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
      .join("");
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
}

export async function storeRecoveryCodes(
  userId: string,
  codes: string[],
): Promise<void> {
  await repo.insertRecoveryCodes(
    userId,
    codes.map((code) => privacyHash(code)),
  );
}

export async function takeRecoveryCode(
  userId: string,
  code: string,
  now: Date = new Date(),
): Promise<boolean> {
  return repo.consumeRecoveryCode(userId, privacyHash(code), now);
}

export async function ensureMfaEnrolled(
  userId: string,
  at: Date,
): Promise<void> {
  const member = await repo.findMember(userId);
  if (!member || member.disabledAt) return;
  if (!member.mfaEnrolledAt) await repo.markMfaEnrolled(userId, at);
}

/** A member who has not finished MFA sees no section. */
export async function memberSectionsOpen(userId: string): Promise<boolean> {
  const member = await repo.findMember(userId);
  return Boolean(member && !member.disabledAt && member.mfaEnrolledAt);
}

export async function confirmStepUp(token: string): Promise<boolean> {
  const live = await readLiveSession(token);
  if (!live) return false;
  await repo.markStepUp(live.session.id, new Date());
  return true;
}

export async function consoleMember(userId: string) {
  const member = await repo.findMember(userId);
  if (!member || member.disabledAt || !isAdminRole(member.role)) return null;
  return {
    role: member.role,
    mfaEnrolled: Boolean(member.mfaEnrolledAt),
  };
}

export async function listMySessions(token: string) {
  const live = await readLiveSession(token);
  if (!live) return null;
  const rows = await repo.listLiveSessions(live.user.id);
  return rows.map((row) => ({
    id: row.id,
    deviceClass: row.deviceClass,
    country: row.country,
    createdAt: row.createdAt.toISOString(),
    current: row.id === live.session.id,
  }));
}

export async function needsRecoveryCodes(userId: string): Promise<boolean> {
  return (await repo.countRecoveryCodes(userId)) === 0;
}

export async function assertAdminLoginOpen(
  subjects: string[],
  now: Date = new Date(),
): Promise<void> {
  for (const subject of subjects) {
    const count = await windowCount("adminLogin", subject, now);
    if (count >= rateRules.adminLogin.limit) {
      throw rateLimited(retryAfterSeconds(now, rateRules.adminLogin));
    }
  }
}

export async function noteAdminLoginFailure(
  subjects: string[],
  now: Date = new Date(),
): Promise<void> {
  let locked = false;
  for (const subject of subjects) {
    const count = await hit(
      `adminLogin:${privacyHash(subject)}`,
      rateRules.adminLogin,
      now,
    );
    if (count >= rateRules.adminLogin.limit) locked = true;
  }
  if (locked) {
    void notifyOwnersLocked().catch((error) => {
      logger.warn({ err: error }, "admin lock mail failed");
    });
  }
}

export async function writeAdminAudit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: Record<string, unknown> | null;
  reason?: string | null;
  ip?: string | null;
  requestId?: string | null;
  deviceClass?: string | null;
}): Promise<void> {
  await recordAudit(input);
}

export function countryOf(headers: Headers): string | null {
  return countryFromHeader(headers.get("x-vercel-ip-country"));
}

export type AdminAccess = {
  user: CurrentUser;
  role: AdminRole | null;
  legacy: boolean;
  session: repo.SessionRow | null;
};

export async function authorizeAdmin(input: {
  host: string | null;
  permission: AdminPermission;
  sessionToken: string | null;
  legacyUser: CurrentUser | null;
  hostOnly: boolean;
}): Promise<AdminAccess> {
  if (isAdminHost(input.host)) {
    const live = await readLiveSession(input.sessionToken);
    if (!live) throw notFound();
    if (!can(live.role, input.permission)) throw notFound();
    return {
      user: live.user,
      role: live.role,
      legacy: false,
      session: live.session,
    };
  }
  if (input.hostOnly) throw notFound();
  if (!input.legacyUser || input.legacyUser.platformRole !== "admin")
    throw notFound();
  const member = await repo.findMember(input.legacyUser.id);
  const role = member && isAdminRole(member.role) ? member.role : null;
  return {
    user: input.legacyUser,
    role,
    legacy: true,
    session: null,
  };
}

export function assertActionAllowed(input: {
  allowed: boolean;
  dangerous: boolean;
  legacy: boolean;
  stepUpFresh: boolean;
  reasonRequired: boolean;
  reason?: string | null;
}): void {
  const decision = evaluateAdminAction(input);
  if (decision.ok) return;
  if (decision.code === "NOT_FOUND") throw notFound();
  if (decision.code === "STEP_UP") {
    throw new HttpError(401, errorCodes.stepUp, "Confirm the second factor");
  }
  throw new HttpError(422, errorCodes.reasonRequired, "A reason is required");
}

export function requestAuditContext(
  request: Request,
  deviceClass: string | null,
) {
  return {
    ip: clientIp(request.headers),
    requestId: request.headers.get(REQUEST_ID_HEADER),
    deviceClass,
  };
}

async function notifyNewDevice(
  userId: string,
  deviceClass: string,
  country: string | null,
): Promise<void> {
  const user = await repo.findUserRow(userId);
  if (!user) return;
  const email = await getAuthUserEmail(user.authUid);
  if (!email) return;
  await sendAdminMail(
    email,
    "New admin sign-in",
    `A new admin sign-in was recorded (${deviceClass}${country ? `, ${country}` : ""}).`,
  );
}

async function notifyOwnersLocked(): Promise<void> {
  const ids = await repo.listOwnerIds();
  for (const id of ids) {
    const user = await repo.findUserRow(id);
    if (!user) continue;
    const email = await getAuthUserEmail(user.authUid);
    if (!email) continue;
    await sendAdminMail(
      email,
      "Admin sign-in locked",
      "An admin sign-in was locked after repeated failures.",
    );
  }
}

async function sendAdminMail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) return;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    logger.warn({ status: response.status }, "admin mail was refused");
  }
}
