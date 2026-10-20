import { sql } from "drizzle-orm";
import {
  char,
  check,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/** One language of the shared profile; level is CEFR when known. */
export type SharedLanguage = { code: string; level: string | null };

/** The shared "about me" profile read by every role (D503, 29.8). */
export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    country: char("country", { length: 2 }),
    city: text("city"),
    timezone: text("timezone"),
    languages: jsonb("languages")
      .$type<SharedLanguage[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    about: text("about"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "user_profiles_display_name_check",
      sql`${table.displayName} IS NULL OR char_length(${table.displayName}) BETWEEN 1 AND 120`,
    ),
    check(
      "user_profiles_country_check",
      sql`${table.country} IS NULL OR ${table.country} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "user_profiles_city_check",
      sql`${table.city} IS NULL OR char_length(${table.city}) BETWEEN 1 AND 120`,
    ),
    check(
      "user_profiles_timezone_check",
      sql`${table.timezone} IS NULL OR char_length(${table.timezone}) BETWEEN 1 AND 64`,
    ),
    check(
      "user_profiles_languages_check",
      sql`jsonb_typeof(${table.languages}) = 'array'`,
    ),
    check(
      "user_profiles_about_check",
      sql`${table.about} IS NULL OR char_length(${table.about}) <= 1000`,
    ),
  ],
);
