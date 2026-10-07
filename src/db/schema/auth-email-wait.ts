import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** PC browser waits while the email link is opened elsewhere (D328). */
export const authEmailWaits = pgTable(
  "auth_email_waits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waitHash: text("wait_hash").notNull().unique(),
    purpose: text("purpose").notNull(),
    locale: text("locale").notNull(),
    handoffTokenHash: text("handoff_token_hash"),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_email_waits_expires_idx").on(table.expiresAt),
    check(
      "auth_email_waits_purpose_check",
      sql`${table.purpose} in ('login', 'signup')`,
    ),
    check(
      "auth_email_waits_locale_check",
      sql`${table.locale} in ('en', 'ru')`,
    ),
  ],
);
