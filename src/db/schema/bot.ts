import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
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
