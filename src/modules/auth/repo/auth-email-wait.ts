import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { authEmailWaits } from "@/db/schema";

export type AuthEmailWait = typeof authEmailWaits.$inferSelect;
export type AuthEmailWaitPurpose = "login" | "signup";

export async function insertAuthEmailWait(input: {
  waitHash: string;
  purpose: AuthEmailWaitPurpose;
  locale: "en" | "ru";
  expiresAt: Date;
}): Promise<void> {
  await getDb().insert(authEmailWaits).values(input);
}

export async function deleteExpiredAuthEmailWaits(now: Date): Promise<void> {
  await getDb().delete(authEmailWaits).where(lt(authEmailWaits.expiresAt, now));
}

export async function markAuthEmailWaitReady(
  waitHash: string,
  handoffTokenHash: string,
  now: Date,
): Promise<AuthEmailWait | null> {
  const [row] = await getDb()
    .update(authEmailWaits)
    .set({
      handoffTokenHash,
      readyAt: now,
    })
    .where(
      and(
        eq(authEmailWaits.waitHash, waitHash),
        isNull(authEmailWaits.readyAt),
        isNull(authEmailWaits.consumedAt),
        gt(authEmailWaits.expiresAt, now),
      ),
    )
    .returning();
  return row ?? null;
}

/** Claims a ready wait once; returns the handoff token hash. */
export async function consumeAuthEmailWait(
  waitHash: string,
  now: Date,
): Promise<string | null> {
  const [row] = await getDb()
    .update(authEmailWaits)
    .set({ consumedAt: now })
    .where(
      and(
        eq(authEmailWaits.waitHash, waitHash),
        isNull(authEmailWaits.consumedAt),
        sql`${authEmailWaits.readyAt} is not null`,
        sql`${authEmailWaits.handoffTokenHash} is not null`,
        gt(authEmailWaits.expiresAt, now),
      ),
    )
    .returning();
  return row?.handoffTokenHash ?? null;
}

export async function findAuthEmailWait(
  waitHash: string,
): Promise<AuthEmailWait | null> {
  const [row] = await getDb()
    .select()
    .from(authEmailWaits)
    .where(eq(authEmailWaits.waitHash, waitHash))
    .limit(1);
  return row ?? null;
}
