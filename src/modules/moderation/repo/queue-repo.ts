import {
  and,
  asc,
  count,
  eq,
  gt,
  inArray,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies, moderationQueue } from "@/db/schema";

export type QueueRow = typeof moderationQueue.$inferSelect;
export type QueueDecision = "approved" | "rejected";

/** Oldest pending first: the SLA is 24 h from creation (14.4). */
export async function listPending(input: {
  limit: number;
  cursor?: { createdAt: Date; id: string };
  entityType?: string;
}): Promise<QueueRow[]> {
  const filters = [
    eq(moderationQueue.status, "pending"),
    input.entityType
      ? eq(moderationQueue.entityType, input.entityType)
      : undefined,
    input.cursor
      ? or(
          gt(moderationQueue.createdAt, input.cursor.createdAt),
          and(
            eq(moderationQueue.createdAt, input.cursor.createdAt),
            gt(moderationQueue.id, input.cursor.id),
          ),
        )
      : undefined,
  ].filter((filter): filter is SQL => filter !== undefined);
  return getDb()
    .select()
    .from(moderationQueue)
    .where(and(...filters))
    .orderBy(asc(moderationQueue.createdAt), asc(moderationQueue.id))
    .limit(input.limit);
}

export async function findItem(id: string): Promise<QueueRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(moderationQueue)
    .where(eq(moderationQueue.id, id))
    .limit(1);
  return row;
}

/**
 * Takes a pending item by deciding it. Only one admin wins a race: the
 * update is conditional on `pending`, the loser gets undefined.
 */
export async function claimItem(
  id: string,
  decision: QueueDecision,
  adminId: string,
  note: string | null,
): Promise<QueueRow | undefined> {
  const [row] = await getDb()
    .update(moderationQueue)
    .set({
      status: decision,
      decidedBy: adminId,
      decisionNote: note,
      decidedAt: new Date(),
    })
    .where(
      and(eq(moderationQueue.id, id), eq(moderationQueue.status, "pending")),
    )
    .returning();
  return row;
}

/** Puts a claimed item back when acting on its entity failed. */
export async function releaseItem(id: string) {
  await getDb()
    .update(moderationQueue)
    .set({
      status: "pending",
      decidedBy: null,
      decisionNote: null,
      decidedAt: null,
    })
    .where(eq(moderationQueue.id, id));
}

/** Other pending items about the same entity get the same decision. */
export async function closeSiblings(
  item: QueueRow,
  decision: QueueDecision,
  adminId: string,
  note: string | null,
) {
  await getDb()
    .update(moderationQueue)
    .set({
      status: decision,
      decidedBy: adminId,
      decisionNote: note,
      decidedAt: new Date(),
    })
    .where(
      and(
        eq(moderationQueue.entityType, item.entityType),
        eq(moderationQueue.entityId, item.entityId),
        eq(moderationQueue.status, "pending"),
        ne(moderationQueue.id, item.id),
      ),
    );
}

export async function findCompanies(ids: string[]) {
  if (!ids.length) return [];
  return getDb()
    .select({
      id: companies.id,
      name: companies.name,
      status: companies.status,
      origin: companies.origin,
    })
    .from(companies)
    .where(inArray(companies.id, ids));
}

export async function countPending(): Promise<number> {
  const [row] = await getDb()
    .select({ count: count() })
    .from(moderationQueue)
    .where(eq(moderationQueue.status, "pending"));
  return row?.count ?? 0;
}
