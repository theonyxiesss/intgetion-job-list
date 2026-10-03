import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  customType,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  cefrLevel,
  companySize,
  employmentType,
  salaryBasis,
  salaryPeriod,
  skillLevel,
  workFormat,
} from "./enums";
import { skills } from "./skills";
import { users } from "./users";

const citext = customType<{ data: string }>({
  dataType() {
    return "extensions.citext";
  },
});

export const candidateProfiles = pgTable(
  "candidate_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name"),
    headline: text("headline"),
    desiredTitles: text("desired_titles").array().notNull().default([]),
    country: char("country", { length: 2 }),
    city: text("city"),
    timezone: text("timezone").notNull(),
    workHoursStart: time("work_hours_start").notNull().default("09:00:00"),
    workHoursEnd: time("work_hours_end").notNull().default("18:00:00"),
    workDays: smallint("work_days").array().notNull().default([1, 2, 3, 4, 5]),
    workFormats: workFormat("work_formats")
      .array()
      .notNull()
      .default(["remote"]),
    employmentTypes: employmentType("employment_types")
      .array()
      .notNull()
      .default(["full_time"]),
    experienceYears: smallint("experience_years"),
    availabilityDate: date("availability_date"),
    salaryMin: bigint("salary_min", { mode: "bigint" }),
    salaryMax: bigint("salary_max", { mode: "bigint" }),
    salaryCurrency: char("salary_currency", { length: 3 }),
    salaryPeriod: salaryPeriod("salary_period"),
    salaryBasis: salaryBasis("salary_basis"),
    minOverlapHours: smallint("min_overlap_hours").notNull().default(3),
    summary: text("summary"),
    isHidden: boolean("is_hidden").notNull().default(false),
    completeness: smallint("completeness").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "candidate_profiles_full_name_check",
      sql`${table.fullName} is null or char_length(${table.fullName}) between 1 and 120`,
    ),
    check(
      "candidate_profiles_headline_check",
      sql`${table.headline} is null or char_length(${table.headline}) between 1 and 160`,
    ),
    check(
      "candidate_profiles_desired_titles_check",
      sql`cardinality(${table.desiredTitles}) <= 5 and not exists (
        select 1 from unnest(${table.desiredTitles}) as title
        where char_length(title) < 1 or char_length(title) > 80
      )`,
    ),
    check(
      "candidate_profiles_country_check",
      sql`${table.country} is null or ${table.country} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "candidate_profiles_city_check",
      sql`${table.city} is null or char_length(${table.city}) between 1 and 80`,
    ),
    check(
      "candidate_profiles_work_days_check",
      sql`cardinality(${table.workDays}) <= 7 and ${table.workDays} <@ array[1,2,3,4,5,6,7]::smallint[]`,
    ),
    check(
      "candidate_profiles_experience_years_check",
      sql`${table.experienceYears} is null or ${table.experienceYears} between 0 and 60`,
    ),
    check(
      "candidate_profiles_min_overlap_check",
      sql`${table.minOverlapHours} between 0 and 12`,
    ),
    check(
      "candidate_profiles_summary_check",
      sql`${table.summary} is null or char_length(${table.summary}) <= 2000`,
    ),
    check(
      "candidate_profiles_completeness_check",
      sql`${table.completeness} between 0 and 100`,
    ),
    check(
      "candidate_profiles_salary_order_check",
      sql`${table.salaryMin} is null or ${table.salaryMax} is null or ${table.salaryMin} <= ${table.salaryMax}`,
    ),
    check(
      "candidate_profiles_salary_parts_check",
      sql`(${table.salaryMin} is null and ${table.salaryMax} is null) or (
        ${table.salaryCurrency} is not null
        and ${table.salaryPeriod} is not null
        and ${table.salaryBasis} is not null
      )`,
    ),
  ],
);

export const candidateSkills = pgTable(
  "candidate_skills",
  {
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidateProfiles.userId, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: skillLevel("level").notNull(),
    years: smallint("years"),
  },
  (table) => [
    primaryKey({ columns: [table.candidateId, table.skillId] }),
    index("candidate_skills_skill_id_idx").on(table.skillId),
    check(
      "candidate_skills_years_check",
      sql`${table.years} is null or ${table.years} between 0 and 60`,
    ),
  ],
);

export const candidateExperience = pgTable(
  "candidate_experience",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidateProfiles.userId, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    title: text("title").notNull(),
    startMonth: date("start_month").notNull(),
    endMonth: date("end_month"),
    description: text("description"),
    sort: smallint("sort").notNull().default(0),
  },
  (table) => [
    index("candidate_experience_candidate_id_idx").on(table.candidateId),
    check(
      "candidate_experience_company_name_check",
      sql`char_length(${table.companyName}) between 1 and 160`,
    ),
    check(
      "candidate_experience_title_check",
      sql`char_length(${table.title}) between 1 and 160`,
    ),
    check(
      "candidate_experience_description_check",
      sql`${table.description} is null or char_length(${table.description}) <= 2000`,
    ),
    check(
      "candidate_experience_months_check",
      sql`${table.endMonth} is null or ${table.endMonth} >= ${table.startMonth}`,
    ),
  ],
);

export const candidateLanguages = pgTable(
  "candidate_languages",
  {
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidateProfiles.userId, { onDelete: "cascade" }),
    lang: char("lang", { length: 2 }).notNull(),
    level: cefrLevel("level").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.candidateId, table.lang] }),
    check("candidate_languages_lang_check", sql`${table.lang} ~ '^[a-z]{2}$'`),
  ],
);

export const candidatePreferences = pgTable(
  "candidate_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    categories: text("categories").array().notNull().default([]),
    companySizes: companySize("company_sizes").array().notNull().default([]),
    notes: text("notes"),
  },
  (table) => [
    check(
      "candidate_preferences_categories_check",
      sql`${table.categories} <@ array['engineering','data','design','product','marketing','sales','support','operations','finance','hr']::text[]`,
    ),
    check(
      "candidate_preferences_notes_check",
      sql`${table.notes} is null or char_length(${table.notes}) <= 500`,
    ),
  ],
);

export const candidateContacts = pgTable(
  "candidate_contacts",
  {
    candidateId: uuid("candidate_id")
      .primaryKey()
      .references(() => candidateProfiles.userId, { onDelete: "cascade" }),
    email: citext("email").notNull(),
    phone: text("phone"),
    telegram: text("telegram"),
    linkedinUrl: text("linkedin_url"),
    websiteUrl: text("website_url"),
    extra: jsonb("extra").$type<Record<string, string>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "candidate_contacts_phone_check",
      sql`${table.phone} is null or ${table.phone} ~ '^\\+[1-9][0-9]{6,14}$'`,
    ),
    check(
      "candidate_contacts_telegram_check",
      sql`${table.telegram} is null or ${table.telegram} ~ '^[A-Za-z][A-Za-z0-9_]{4,31}$'`,
    ),
    check(
      "candidate_contacts_linkedin_check",
      sql`${table.linkedinUrl} is null or (
        char_length(${table.linkedinUrl}) <= 300
        and ${table.linkedinUrl} ~ '^https?://'
      )`,
    ),
    check(
      "candidate_contacts_website_check",
      sql`${table.websiteUrl} is null or (
        char_length(${table.websiteUrl}) <= 300
        and ${table.websiteUrl} ~ '^https?://'
      )`,
    ),
  ],
);
