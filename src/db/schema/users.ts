import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { accountType, platformRole, userStatus } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUid: uuid("auth_uid").notNull().unique(),
    platformRole: platformRole("platform_role").notNull().default("user"),
    status: userStatus("status").notNull().default("active"),
    accountType: accountType("account_type").notNull().default("candidate"),
    locale: text("locale").notNull().default("en"),
    termsAcceptedAt: timestamp("terms_accepted_at", {
      withTimezone: true,
    }).notNull(),
    termsVersion: text("terms_version").notNull(),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check("users_locale_check", sql`${table.locale} in ('en', 'ru', 'es')`),
  ],
);
