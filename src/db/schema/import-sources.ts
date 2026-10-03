import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jobs } from "./jobs";

export const importSources = pgTable("import_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  kind: text("kind").notNull(),
  url: text("url"),
  enabled: boolean("enabled").notNull().default(false),
  republishAllowed: boolean("republish_allowed").notNull().default(false),
  config: jsonb("config").notNull().default({}),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastStatus: text("last_status"),
});

/**
 * One row per (source, external id). A merged job has a row for every
 * source that carries it (13.3); exactly one row per job is primary and is
 * what public pages show as `source` (D71).
 */
export const jobSources = pgTable(
  "job_sources",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    importSourceId: uuid("import_source_id")
      .notNull()
      .references(() => importSources.id),
    externalId: text("external_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    isPrimary: boolean("is_primary").notNull().default(true),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.importSourceId, table.externalId] }),
    index("job_sources_job_idx").on(table.jobId),
    uniqueIndex("job_sources_primary_idx")
      .on(table.jobId)
      .where(sql`${table.isPrimary}`),
  ],
);
