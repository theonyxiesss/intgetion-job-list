import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { importSources } from "./import-sources";

export const importRuns = pgTable(
  "import_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => importSources.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    fetched: integer("fetched").notNull().default(0),
    created: integer("created").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    merged: integer("merged").notNull().default(0),
    rejected: integer("rejected").notNull().default(0),
    expired: integer("expired").notNull().default(0),
    error: text("error"),
  },
  (table) => [
    index("import_runs_source_started_idx").on(table.sourceId, table.startedAt),
    index("import_runs_retention_idx").on(table.finishedAt),
  ],
);
