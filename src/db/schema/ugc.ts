import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  UgcCampaignStatus,
  UgcCreatorStatus,
  UgcGoal,
  UgcNiche,
  UgcParticipationStatus,
  UgcPlatform,
  UgcRights,
  UgcSubmissionStatus,
} from "@/config/ugc";
import type { TermsSnapshot } from "@/modules/ugc/service/terms";
import { companies } from "./companies";
import { users } from "./users";

/** Private editable UGC brief shared by the chat and form (D492). */
export const ugcBriefDrafts = pgTable(
  "ugc_brief_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    draft: jsonb("draft")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ugc_brief_drafts_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
  ],
);

/** A creator who can apply to creative tests (D448). Not a candidate profile. */
export const creatorProfiles = pgTable(
  "creator_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    platforms: text("platforms").array().$type<UgcPlatform[]>().notNull(),
    niches: text("niches").array().$type<UgcNiche[]>().notNull(),
    exampleUrls: text("example_urls").array().notNull().default([]),
    inviteOptIn: boolean("invite_opt_in").notNull().default(false),
    status: text("status")
      .$type<UgcCreatorStatus>()
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "creator_profiles_name_len",
      sql`char_length(${table.displayName}) between 1 and 80`,
    ),
    check(
      "creator_profiles_status_check",
      sql`${table.status} in ('active', 'paused')`,
    ),
    check(
      "creator_profiles_examples_count",
      sql`cardinality(${table.exampleUrls}) <= 5`,
    ),
  ],
);

/** One brief. The freelance shelf reads this row; it does not copy it (D445). */
export const ugcCampaigns = pgTable(
  "ugc_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status")
      .$type<UgcCampaignStatus>()
      .notNull()
      .default("draft"),
    productName: text("product_name").notNull(),
    productSummary: text("product_summary").notNull(),
    goal: text("goal").$type<UgcGoal>().notNull(),
    niches: text("niches").array().$type<UgcNiche[]>().notNull(),
    audience: text("audience").notNull(),
    country: text("country"),
    countries: text("countries").array().notNull().default([]),
    languages: text("languages").array().notNull(),
    mustSay: text("must_say").notNull(),
    mustNot: text("must_not").notNull(),
    platforms: text("platforms").array().$type<UgcPlatform[]>().notNull(),
    videosWanted: integer("videos_wanted").notNull(),
    bountyMinor: bigint("bounty_minor", { mode: "bigint" }).notNull(),
    deadline: date("deadline").notNull(),
    rights: text("rights").$type<UgcRights>().notNull(),
    pitch: text("pitch").notNull().default(""),
    exampleUrls: text("example_urls").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ugc_campaigns_company_idx").on(table.companyId, table.status),
    index("ugc_campaigns_open_idx").on(table.status, table.deadline),
    check(
      "ugc_campaigns_status_check",
      sql`${table.status} in ('draft', 'pending_review', 'open', 'paused', 'closed', 'rejected')`,
    ),
    check(
      "ugc_campaigns_goal_check",
      sql`${table.goal} in ('awareness', 'installs', 'purchases', 'waitlist')`,
    ),
    check(
      "ugc_campaigns_rights_check",
      sql`${table.rights} in ('organic', 'ads', 'whitelist')`,
    ),
    check(
      "ugc_campaigns_videos_check",
      sql`${table.videosWanted} between 1 and 30`,
    ),
    check(
      "ugc_campaigns_bounty_check",
      sql`${table.bountyMinor} between 500 and 50000`,
    ),
    check("ugc_campaigns_pitch_len", sql`char_length(${table.pitch}) <= 300`),
    check(
      "ugc_campaigns_examples_count",
      sql`cardinality(${table.exampleUrls}) <= 5`,
    ),
  ],
);

/** An application or a hire. One creator per campaign. */
export const ugcInvites = pgTable(
  "ugc_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => ugcCampaigns.id, { onDelete: "cascade" }),
    creatorUserId: uuid("creator_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").$type<UgcParticipationStatus>().notNull(),
    bountyMinor: bigint("bounty_minor", { mode: "bigint" }),
    rights: text("rights").$type<UgcRights>(),
    pitch: text("pitch").notNull().default(""),
    reminders: smallint("reminders").notNull().default(0),
    revisionUsed: boolean("revision_used").notNull().default(false),
    deadlineNoted: boolean("deadline_noted").notNull().default(false),
    offeredAt: timestamp("offered_at", { withTimezone: true }),
    /** Terms the offer carried and their hash; null on offers made before U3 (0074). */
    terms: jsonb("terms").$type<TermsSnapshot>(),
    termsHash: text("terms_hash"),
    /** The hash the creator agreed to and when; null until they accept. */
    agreedHash: text("agreed_hash"),
    agreedAt: timestamp("agreed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("ugc_invites_campaign_creator_key").on(
      table.campaignId,
      table.creatorUserId,
    ),
    index("ugc_invites_creator_idx").on(table.creatorUserId, table.status),
    check(
      "ugc_invites_status_check",
      sql`${table.status} in ('applied', 'offered', 'hired', 'declined', 'expired', 'withdrawn')`,
    ),
    check(
      "ugc_invites_reminders_check",
      sql`${table.reminders} between 0 and 1`,
    ),
  ],
);

/** One review link per hire. */
export const ugcSubmissions = pgTable(
  "ugc_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => ugcInvites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    hook: text("hook").notNull().default(""),
    status: text("status").$type<UgcSubmissionStatus>().notNull(),
    changeNote: text("change_note").notNull().default(""),
    liveUrl: text("live_url"),
    reportedViews: integer("reported_views"),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("ugc_submissions_invite_key").on(table.inviteId),
    check(
      "ugc_submissions_status_check",
      sql`${table.status} in ('submitted', 'changes_requested', 'accepted', 'rejected', 'winner')`,
    ),
    check(
      "ugc_submissions_note_len",
      sql`char_length(${table.changeNote}) <= 500`,
    ),
    check(
      "ugc_submissions_live_url_len",
      sql`${table.liveUrl} is null or char_length(${table.liveUrl}) <= 500`,
    ),
    check(
      "ugc_submissions_reported_views_check",
      sql`${table.reportedViews} is null or ${table.reportedViews} between 0 and 2000000000`,
    ),
    check(
      "ugc_submissions_report_pair",
      sql`(${table.liveUrl} is null and ${table.reportedViews} is null and ${table.reportedAt} is null) or (${table.liveUrl} is not null and ${table.reportedViews} is not null and ${table.reportedAt} is not null)`,
    ),
  ],
);

/** A recorded reward. The platform does not transfer it (phase C, D459). */
export const ugcPayouts = pgTable(
  "ugc_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => ugcSubmissions.id, { onDelete: "cascade" }),
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => ugcInvites.id, { onDelete: "cascade" }),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    status: text("status").$type<"owed" | "paid">().notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidBy: uuid("paid_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    /** Set when the reward went out from the campaign wallet (D466). */
    chain: text("chain"),
    token: text("token"),
    recipient: text("recipient"),
    txHash: text("tx_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("ugc_payouts_submission_key").on(table.submissionId),
    check("ugc_payouts_status_check", sql`${table.status} in ('owed', 'paid')`),
    check(
      "ugc_payouts_amount_check",
      sql`${table.amountMinor} between 500 and 50000`,
    ),
    check(
      "ugc_payouts_paid_pair",
      sql`(${table.status} = 'owed' and ${table.paidAt} is null and ${table.paidBy} is null) or (${table.status} = 'paid' and ${table.paidAt} is not null and ${table.paidBy} is not null)`,
    ),
  ],
);

/** Hash of a join link. The raw token is never stored (27.13). */
export const ugcJoinTokens = pgTable(
  "ugc_join_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => ugcCampaigns.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("ugc_join_tokens_hash_key").on(table.tokenHash),
    index("ugc_join_tokens_campaign_idx").on(table.campaignId),
  ],
);
