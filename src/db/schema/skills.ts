import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { moderationStatus } from "./enums";

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    nameEn: text("name_en").notNull(),
    nameRu: text("name_ru").notNull(),
    category: text("category").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    check(
      "skills_category_check",
      sql`${table.category} in ('engineering', 'data', 'design', 'product', 'marketing', 'sales', 'support', 'operations', 'finance', 'hr')`,
    ),
  ],
);

export const skillsAliases = pgTable(
  "skills_aliases",
  {
    aliasNormalized: text("alias_normalized").primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("skills_aliases_skill_id_idx").on(table.skillId),
    check(
      "skills_aliases_normalized_check",
      sql`char_length(${table.aliasNormalized}) >= 1`,
    ),
  ],
);

export const skillSuggestions = pgTable(
  "skill_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rawText: text("raw_text").notNull(),
    normalized: text("normalized").notNull().unique(),
    source: text("source").notNull(),
    occurrences: integer("occurrences").notNull().default(1),
    status: moderationStatus("status").notNull().default("pending"),
    mappedSkillId: uuid("mapped_skill_id").references(() => skills.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("skill_suggestions_mapped_skill_id_idx").on(table.mappedSkillId),
    check(
      "skill_suggestions_source_check",
      sql`${table.source} in ('user', 'bot', 'import')`,
    ),
    check(
      "skill_suggestions_occurrences_check",
      sql`${table.occurrences} >= 1`,
    ),
    check(
      "skill_suggestions_normalized_check",
      sql`char_length(${table.normalized}) >= 1`,
    ),
    check(
      "skill_suggestions_raw_text_check",
      sql`char_length(${table.rawText}) between 1 and 500`,
    ),
  ],
);
