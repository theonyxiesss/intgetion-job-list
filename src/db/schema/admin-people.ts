import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/** Hashed email or Telegram id that must not register again (D297). */
export const blocklist = pgTable(
  "blocklist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    valueHash: text("value_hash").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("blocklist_kind_hash_idx").on(table.kind, table.valueHash),
    index("blocklist_user_idx").on(table.userId),
    check("blocklist_kind_check", sql`${table.kind} in ('email', 'telegram')`),
  ],
);

/** Append-only staff notes. The app role cannot update or delete them (D296). */
export const adminNotes = pgTable(
  "admin_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    body: text("body").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_notes_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    check(
      "admin_notes_entity_type_check",
      sql`${table.entityType} in ('user', 'company')`,
    ),
    check(
      "admin_notes_body_check",
      sql`char_length(${table.body}) between 1 and 2000`,
    ),
  ],
);

/** A second admin must approve a ban or a deletion (D295). */
export const adminApprovals = pgTable(
  "admin_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    reason: text("reason").notNull(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decision: text("decision"),
  },
  (table) => [
    index("admin_approvals_entity_idx").on(table.entityId, table.requestedAt),
    check(
      "admin_approvals_action_check",
      sql`${table.action} in ('users.ban', 'users.delete')`,
    ),
  ],
);
