import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const mcpClients = pgTable(
  "mcp_clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    active: text("active").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "mcp_clients_active_check",
      sql`${table.active} in ('active', 'revoked')`,
    ),
  ],
);

export const mcpAuthorizationRequests = pgTable(
  "mcp_authorization_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: text("client_id")
      .notNull()
      .references(() => mcpClients.id, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    state: text("state"),
    codeChallenge: text("code_challenge").notNull(),
    resource: text("resource").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("mcp_authorization_requests_expires_idx").on(table.expiresAt),
  ],
);

export const mcpGrants = pgTable(
  "mcp_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => mcpClients.id, { onDelete: "cascade" }),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    resource: text("resource").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("mcp_grants_user_idx").on(table.userId, table.revokedAt),
    uniqueIndex("mcp_grants_active_user_client_idx")
      .on(table.userId, table.clientId)
      .where(sql`${table.revokedAt} is null`),
  ],
);

export const mcpAuthorizationCodes = pgTable(
  "mcp_authorization_codes",
  {
    codeHash: text("code_hash").primaryKey(),
    grantId: uuid("grant_id")
      .notNull()
      .references(() => mcpGrants.id, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    resource: text("resource").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("mcp_authorization_codes_expires_idx").on(table.expiresAt)],
);

export const mcpTokens = pgTable(
  "mcp_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    grantId: uuid("grant_id")
      .notNull()
      .references(() => mcpGrants.id, { onDelete: "cascade" }),
    accessTokenHash: text("access_token_hash").notNull().unique(),
    refreshTokenHash: text("refresh_token_hash").notNull().unique(),
    accessExpiresAt: timestamp("access_expires_at", {
      withTimezone: true,
    }).notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at", {
      withTimezone: true,
    }).notNull(),
    replacedById: uuid("replaced_by_id"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("mcp_tokens_grant_idx").on(table.grantId, table.revokedAt)],
);

export const mcpPersonalTokens = pgTable(
  "mcp_personal_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    resource: text("resource").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("mcp_personal_tokens_user_idx").on(table.userId, table.revokedAt),
  ],
);
