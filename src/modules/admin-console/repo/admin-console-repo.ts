import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  adminMembers,
  adminRecoveryCodes,
  adminSessions,
  users,
} from "@/db/schema";
import type { AdminRole } from "@/admin/permissions";

export type MemberRow = typeof adminMembers.$inferSelect;
export type SessionRow = typeof adminSessions.$inferSelect;

export async function findMember(
  userId: string,
): Promise<MemberRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(adminMembers)
    .where(eq(adminMembers.userId, userId))
    .limit(1);
  return row;
}

export async function upsertMember(
  userId: string,
  role: AdminRole,
): Promise<void> {
  await getDb()
    .insert(adminMembers)
    .values({ userId, role })
    .onConflictDoUpdate({
      target: adminMembers.userId,
      set: { role, disabledAt: null },
    });
}

export async function markMfaEnrolled(userId: string, at: Date): Promise<void> {
  await getDb()
    .update(adminMembers)
    .set({ mfaEnrolledAt: at })
    .where(eq(adminMembers.userId, userId));
}

export async function findUserRow(userId: string) {
  const [row] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

export async function insertSession(input: {
  userId: string;
  tokenHash: string;
  deviceClass: string;
  country: string | null;
  now: Date;
}): Promise<SessionRow> {
  const [row] = await getDb()
    .insert(adminSessions)
    .values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      deviceClass: input.deviceClass,
      country: input.country,
      createdAt: input.now,
      lastSeenAt: input.now,
      lastStepUpAt: input.now,
    })
    .returning();
  if (!row) throw new Error("admin session was not stored");
  return row;
}

export async function findSessionByHash(
  tokenHash: string,
): Promise<SessionRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(adminSessions)
    .where(eq(adminSessions.tokenHash, tokenHash))
    .limit(1);
  return row;
}

export async function touchSession(id: string, seenAt: Date): Promise<void> {
  await getDb()
    .update(adminSessions)
    .set({ lastSeenAt: seenAt })
    .where(and(eq(adminSessions.id, id), isNull(adminSessions.revokedAt)));
}

export async function markStepUp(id: string, at: Date): Promise<void> {
  await getDb()
    .update(adminSessions)
    .set({ lastStepUpAt: at, lastSeenAt: at })
    .where(eq(adminSessions.id, id));
}

export async function revokeSession(id: string, at: Date): Promise<void> {
  await getDb()
    .update(adminSessions)
    .set({ revokedAt: at })
    .where(and(eq(adminSessions.id, id), isNull(adminSessions.revokedAt)));
}

export async function listLiveSessions(userId: string): Promise<SessionRow[]> {
  return getDb()
    .select()
    .from(adminSessions)
    .where(
      and(eq(adminSessions.userId, userId), isNull(adminSessions.revokedAt)),
    )
    .orderBy(desc(adminSessions.createdAt));
}

export async function hasSeenDevice(
  userId: string,
  deviceClass: string,
  country: string | null,
): Promise<boolean> {
  const rows = await getDb().execute<{ n: number }>(sql`
    select 1 as n
    from admin_sessions
    where user_id = ${userId}
      and device_class = ${deviceClass}
      and country is not distinct from ${country}
      and revoked_at is null
    limit 1
  `);
  return rows.length > 0;
}

export async function insertRecoveryCodes(
  userId: string,
  hashes: string[],
): Promise<void> {
  if (hashes.length === 0) return;
  await getDb()
    .insert(adminRecoveryCodes)
    .values(hashes.map((codeHash) => ({ userId, codeHash })));
}

export async function countRecoveryCodes(userId: string): Promise<number> {
  const rows = await getDb().execute<{ n: number }>(sql`
    select count(*)::int as n
    from admin_recovery_codes
    where user_id = ${userId}
  `);
  return Number(rows[0]?.n ?? 0);
}

export async function consumeRecoveryCode(
  userId: string,
  codeHash: string,
  at: Date,
): Promise<boolean> {
  const rows = await getDb().execute<{ id: string }>(sql`
    update admin_recovery_codes
    set used_at = ${at.toISOString()}
    where user_id = ${userId}
      and code_hash = ${codeHash}
      and used_at is null
    returning id
  `);
  return rows.length > 0;
}

export async function listOwnerIds(): Promise<string[]> {
  const rows = await getDb()
    .select({ userId: adminMembers.userId })
    .from(adminMembers)
    .where(
      and(eq(adminMembers.role, "owner"), isNull(adminMembers.disabledAt)),
    );
  return rows.map((row) => row.userId);
}
