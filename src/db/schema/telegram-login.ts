import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** One-time bot sign-in (D256). The raw code stays in an httpOnly cookie. */
export const telegramLoginChallenges = pgTable(
  "telegram_login_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: text("code_hash").notNull().unique(),
    locale: text("locale").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    telegramId: text("telegram_id"),
    username: text("username"),
    firstName: text("first_name"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("telegram_login_challenges_expires_idx").on(table.expiresAt),
    check(
      "telegram_login_challenges_locale_check",
      sql`${table.locale} in ('en', 'ru')`,
    ),
  ],
);
