import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  uniqueIndex,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { jobs } from "./jobs";
import { ugcCampaigns, ugcInvites } from "./ugc";
import { users } from "./users";

export const botConversations = pgTable(
  "bot_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    channel: text("channel").notNull().default("web"),
    sessionTokenHash: text("session_token_hash").notNull().unique(),
    locale: text("locale"),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => ugcCampaigns.id, {
      onDelete: "cascade",
    }),
    inviteId: uuid("invite_id").references(() => ugcInvites.id, {
      onDelete: "cascade",
    }),
    state: jsonb("state").notNull().default({}),
    summary: text("summary"),
    linkedAt: timestamp("linked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bot_conversations_user_idx").on(table.userId, table.lastMessageAt),
    uniqueIndex("bot_conversations_user_job_idx")
      .on(table.userId, table.jobId)
      .where(sql`${table.userId} is not null and ${table.jobId} is not null`),
    uniqueIndex("bot_conversations_user_campaign_idx")
      .on(table.userId, table.campaignId)
      .where(
        sql`${table.userId} is not null and ${table.campaignId} is not null`,
      ),
    uniqueIndex("bot_conversations_user_invite_idx")
      .on(table.userId, table.inviteId)
      .where(
        sql`${table.userId} is not null and ${table.inviteId} is not null`,
      ),
    check("bot_conversations_channel_check", sql`${table.channel} in ('web')`),
  ],
);

export const botMessages = pgTable(
  "bot_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => botConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull().default(""),
    toolCall: jsonb("tool_call"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costMicroUsd: bigint("cost_micro_usd", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bot_messages_conversation_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    check(
      "bot_messages_role_check",
      sql`${table.role} in ('user', 'assistant', 'tool', 'system_event')`,
    ),
  ],
);

/** Facts a person told Spoki about themselves (D469). No contacts. */
export const botMemoryFacts = pgTable(
  "bot_memory_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fact: text("fact").notNull(),
    source: text("source").notNull().default("chat"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bot_memory_facts_user_idx").on(table.userId, table.createdAt),
    check(
      "bot_memory_facts_fact_check",
      sql`char_length(${table.fact}) between 1 and 200`,
    ),
    check(
      "bot_memory_facts_source_check",
      sql`${table.source} in ('chat', 'site')`,
    ),
  ],
);

export const botConfirmations = pgTable(
  "bot_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => botConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tool: text("tool").notNull(),
    args: jsonb("args").notNull(),
    argsHash: text("args_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    accepted: boolean("accepted"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bot_confirmations_conversation_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);
