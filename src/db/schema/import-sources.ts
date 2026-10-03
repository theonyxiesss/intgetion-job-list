import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { jobs } from "./jobs";

export const importSources = pgTable("import_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  url: text("url"),
  enabled: boolean("enabled").notNull().default(false),
  republishAllowed: boolean("republish_allowed").notNull().default(false),
  config: jsonb("config").notNull().default({}),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastStatus: text("last_status"),
});
export const jobSources = pgTable("job_sources", {
  jobId: uuid("job_id")
    .primaryKey()
    .references(() => jobs.id, { onDelete: "cascade" }),
  importSourceId: uuid("import_source_id")
    .notNull()
    .references(() => importSources.id),
  externalId: text("external_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
