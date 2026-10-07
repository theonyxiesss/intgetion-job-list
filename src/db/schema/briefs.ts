import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/** The three morning slots the admin moves and pauses (D340). */
export const briefSlots = pgTable(
  "brief_slots",
  {
    id: text("id").primaryKey(),
    timezone: text("timezone").notNull(),
    localTime: text("local_time").notNull().default("08:00"),
    enabled: boolean("enabled").notNull().default(true),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "brief_slots_id_check",
      sql`${table.id} in ('americas', 'europe', 'cis')`,
    ),
    check(
      "brief_slots_time_check",
      sql`${table.localTime} ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$'`,
    ),
  ],
);

/** One row: the global pause (D340). */
export const briefSettings = pgTable(
  "brief_settings",
  {
    id: boolean("id").primaryKey().default(true),
    paused: boolean("paused").notNull().default(false),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check("brief_settings_single_row", sql`${table.id}`)],
);

/** A slot run, live once per local day, dry runs any time (D340). */
export const briefRuns = pgTable(
  "brief_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slotId: text("slot_id")
      .notNull()
      .references(() => briefSlots.id),
    slotDate: date("slot_date").notNull(),
    dryRun: boolean("dry_run").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    checked: integer("checked").notNull().default(0),
    sent: integer("sent").notNull().default(0),
    empty: integer("empty").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    error: text("error"),
  },
  (table) => [
    uniqueIndex("brief_runs_live_once_idx")
      .on(table.slotId, table.slotDate)
      .where(sql`not ${table.dryRun}`),
    index("brief_runs_started_idx").on(table.startedAt.desc()),
  ],
);

/** Who got a brief for which slot day: the guard against a second one. */
export const briefDeliveries = pgTable(
  "brief_deliveries",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    audience: text("audience").notNull(),
    slotDate: date("slot_date").notNull(),
    slotId: text("slot_id")
      .notNull()
      .references(() => briefSlots.id),
    itemIds: text("item_ids").array().notNull().default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.audience, table.slotDate] }),
    check(
      "brief_deliveries_audience_check",
      sql`${table.audience} in ('candidate', 'employer')`,
    ),
  ],
);
