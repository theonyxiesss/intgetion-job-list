import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { jobs } from "./jobs";
import { users } from "./users";

export const matchingResults = pgTable(
  "matching_results",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 5, scale: 4 }).notNull(),
    breakdown: jsonb("breakdown").notNull(),
    explain: jsonb("explain").notNull(),
    algoVersion: smallint("algo_version").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.jobId] }),
    index("matching_results_user_score_idx").on(table.userId, table.score),
    check(
      "matching_results_score_check",
      sql`${table.score} >= 0 and ${table.score} <= 1`,
    ),
  ],
);

/** Recompute queue for newly published jobs (6B, D161). */
export const matchingJobs = pgTable(
  "matching_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    runAfter: timestamp("run_after", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    considered: integer("considered"),
    written: integer("written"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("matching_jobs_pending_job_idx")
      .on(table.jobId)
      .where(sql`${table.status} = 'pending'`),
    index("matching_jobs_due_idx").on(table.status, table.runAfter),
    check(
      "matching_jobs_status_check",
      sql`${table.status} in ('pending', 'running', 'done', 'failed')`,
    ),
    check(
      "matching_jobs_attempts_check",
      sql`${table.attempts} between 0 and 5`,
    ),
  ],
);
