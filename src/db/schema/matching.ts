import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
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
