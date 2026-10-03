import { and, desc, eq, lt, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs, users } from "@/db/schema";

export type AdminUserRow = Pick<
  typeof users.$inferSelect,
  "id" | "platformRole" | "status" | "locale" | "createdAt" | "lastActiveAt"
>;

export type AuditRow = typeof auditLogs.$inferSelect;

export type TimeCursor = { createdAt: Date; id: string };

function before(
  createdAt: typeof users.createdAt | typeof auditLogs.createdAt,
  id: typeof users.id | typeof auditLogs.id,
  cursor?: TimeCursor,
): SQL | undefined {
  if (!cursor) return undefined;
  return or(
    lt(createdAt, cursor.createdAt),
    and(eq(createdAt, cursor.createdAt), lt(id, cursor.id)),
  );
}

const userColumns = {
  id: users.id,
  platformRole: users.platformRole,
  status: users.status,
  locale: users.locale,
  createdAt: users.createdAt,
  lastActiveAt: users.lastActiveAt,
};

/**
 * Newest users first. Login emails live in Supabase Auth, not in `users`,
 * so search here is by exact id and status (D80).
 */
export async function listUsers(input: {
  limit: number;
  cursor?: TimeCursor;
  id?: string;
  status?: AdminUserRow["status"];
}): Promise<AdminUserRow[]> {
  const filters = [
    input.id ? eq(users.id, input.id) : undefined,
    input.status ? eq(users.status, input.status) : undefined,
    before(users.createdAt, users.id, input.cursor),
  ].filter((filter): filter is SQL => filter !== undefined);
  return getDb()
    .select(userColumns)
    .from(users)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(input.limit);
}

export async function findUser(id: string): Promise<AdminUserRow | undefined> {
  const [row] = await getDb()
    .select(userColumns)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row;
}

/** Changes status only from `from`; returns the row, or undefined if it was not in `from`. */
export async function setUserStatus(
  id: string,
  from: AdminUserRow["status"],
  to: AdminUserRow["status"],
): Promise<AdminUserRow | undefined> {
  const [row] = await getDb()
    .update(users)
    .set({ status: to })
    .where(and(eq(users.id, id), eq(users.status, from)))
    .returning(userColumns);
  return row;
}

export async function listAudit(input: {
  limit: number;
  cursor?: TimeCursor;
  action?: string;
  entityType?: string;
  actorId?: string;
}): Promise<AuditRow[]> {
  const filters = [
    input.action ? eq(auditLogs.action, input.action) : undefined,
    input.entityType ? eq(auditLogs.entityType, input.entityType) : undefined,
    input.actorId ? eq(auditLogs.actorId, input.actorId) : undefined,
    before(auditLogs.createdAt, auditLogs.id, input.cursor),
  ].filter((filter): filter is SQL => filter !== undefined);
  return getDb()
    .select()
    .from(auditLogs)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(input.limit);
}
