import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    diff: jsonb("diff"),
    ipHash: text("ip_hash"),
    reason: text("reason"),
    requestId: text("request_id"),
    deviceClass: text("device_class"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_idx").on(table.actorId, table.createdAt),
  ],
);

export const rateLimitCounters = pgTable(
  "rate_limit_counters",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.windowStart] }),
    index("rate_limit_counters_window_idx").on(table.windowStart),
  ],
);

/** Proof of each cookie choice (D220); purged after 3 years. */
export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id"),
    choice: text("choice").notNull(),
    policyVersion: text("policy_version").notNull(),
    gpc: boolean("gpc").notNull().default(false),
    source: text("source").notNull(),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("consent_records_user_idx").on(table.userId, table.createdAt),
    index("consent_records_created_idx").on(table.createdAt),
  ],
);
