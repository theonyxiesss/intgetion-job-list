import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  mcpAuthorizationCodes,
  mcpAuthorizationRequests,
  mcpClients,
  mcpGrants,
  mcpPersonalTokens,
  mcpTokens,
  users,
} from "@/db/schema";
import { notFound, rateLimited, validationError } from "@/lib/http";
import { hit, rateKey, retryAfterSeconds } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { fetchCimdDocument, validateCimdUrl } from "./cimd";

export const MCP_SCOPES = [
  "profile:read",
  "applications:read",
  "saved:read",
  "freelance:read",
  "ugc:read",
  "reminders:read",
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 2 * 60 * 1000;
const CLIENT_ID_PREFIX = "intg_";
const PERSONAL_TOKEN_PREFIX = "intg_pat_";

export type McpPrincipal = {
  userId: string;
  clientId: string;
  grantId?: string;
  scopes: McpScope[];
  expiresAt: number;
  resource: string;
};

export type McpClient = {
  id: string;
  name: string;
  redirectUris: string[];
  active: "active" | "revoked";
};

export type McpAuthorizationRequest = {
  id: string;
  clientId: string;
  clientName: string;
  redirectUri: string;
  scopes: McpScope[];
  state: string | null;
  codeChallenge: string;
  resource: string;
  expiresAt: Date;
};

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function randomSecret(): string {
  return randomBytes(32).toString("base64url");
}

function scopesOf(value: unknown): McpScope[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (scope): scope is McpScope =>
      typeof scope === "string" && MCP_SCOPES.includes(scope as McpScope),
  );
}

function validRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      !url.hash &&
      !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

/** Register a public OAuth client. Client secrets are not issued or stored. */
export async function registerMcpClient(input: {
  name: string;
  redirectUris: string[];
  metadata: Record<string, unknown>;
}): Promise<McpClient> {
  const name = input.name.trim();
  const redirectUris = [...new Set(input.redirectUris)];
  if (
    name.length < 1 ||
    name.length > 100 ||
    redirectUris.length < 1 ||
    redirectUris.length > 10 ||
    redirectUris.some((uri) => !validRedirectUri(uri)) ||
    Object.keys(input.metadata).length > 32 ||
    JSON.stringify(input.metadata).length > 8192
  ) {
    throw validationError();
  }
  const id = `${CLIENT_ID_PREFIX}${randomSecret()}`;
  const [row] = await getDb()
    .insert(mcpClients)
    .values({ id, name, redirectUris, metadata: input.metadata })
    .returning();
  if (!row) throw new Error("MCP client registration was not stored");
  return { id: row.id, name: row.name, redirectUris, active: "active" };
}

export function isValidMcpResource(value: string): boolean {
  return validResource(value);
}

export async function getMcpClientMetadata(id: string) {
  const [row] = await getDb()
    .select({
      id: mcpClients.id,
      name: mcpClients.name,
      metadata: mcpClients.metadata,
    })
    .from(mcpClients)
    .where(and(eq(mcpClients.id, id), eq(mcpClients.active, "active")))
    .limit(1);
  return row ?? null;
}

export async function getMcpClient(id: string): Promise<McpClient | null> {
  const [row] = await getDb()
    .select()
    .from(mcpClients)
    .where(eq(mcpClients.id, id))
    .limit(1);
  if (!row || row.active !== "active") return null;
  return {
    id: row.id,
    name: row.name,
    redirectUris: Array.isArray(row.redirectUris) ? row.redirectUris : [],
    active: "active",
  };
}

/** Resolve and cache a CIMD client after validating its HTTPS document safely. */
export async function resolveMcpClient(id: string): Promise<McpClient | null> {
  const known = await getMcpClient(id);
  if (known) return known;
  if (!validateCimdUrl(id)) return null;
  const metadata = await fetchCimdDocument(id);
  if (!metadata) return null;
  try {
    const [row] = await getDb()
      .insert(mcpClients)
      .values({
        id,
        name: metadata.client_name,
        redirectUris: metadata.redirect_uris,
        metadata,
      })
      .onConflictDoNothing()
      .returning();
    if (row)
      return {
        id: row.id,
        name: row.name,
        redirectUris: metadata.redirect_uris,
        active: "active",
      };
  } catch {
    // Concurrent registration can race; re-read the winning row below.
  }
  return getMcpClient(id);
}

export async function createMcpAuthorizationRequest(input: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string | null;
  codeChallenge: string;
  resource: string;
  now?: Date;
}): Promise<string> {
  const client = await resolveMcpClient(input.clientId);
  if (!client || !client.redirectUris.includes(input.redirectUri)) {
    throw notFound();
  }
  if (
    !validResource(input.resource) ||
    !validRedirectUri(input.redirectUri) ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(input.codeChallenge) ||
    input.scopes.some((scope) => !MCP_SCOPES.includes(scope as McpScope))
  ) {
    throw validationError();
  }
  const [request] = await getDb()
    .insert(mcpAuthorizationRequests)
    .values({
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      scopes: input.scopes,
      state: input.state,
      codeChallenge: input.codeChallenge,
      resource: input.resource,
      expiresAt: new Date((input.now ?? new Date()).getTime() + 5 * 60 * 1000),
    })
    .returning({ id: mcpAuthorizationRequests.id });
  if (!request) throw new Error("MCP authorization request was not stored");
  return request.id;
}

function validResource(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.pathname === "/api/mcp" &&
      !url.search &&
      !url.hash &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

export async function getMcpAuthorizationRequest(
  id: string,
  now = new Date(),
): Promise<McpAuthorizationRequest | null> {
  const [row] = await getDb()
    .select({
      id: mcpAuthorizationRequests.id,
      clientId: mcpAuthorizationRequests.clientId,
      clientName: mcpClients.name,
      redirectUri: mcpAuthorizationRequests.redirectUri,
      scopes: mcpAuthorizationRequests.scopes,
      state: mcpAuthorizationRequests.state,
      codeChallenge: mcpAuthorizationRequests.codeChallenge,
      resource: mcpAuthorizationRequests.resource,
      expiresAt: mcpAuthorizationRequests.expiresAt,
      consumedAt: mcpAuthorizationRequests.consumedAt,
      active: mcpClients.active,
    })
    .from(mcpAuthorizationRequests)
    .innerJoin(mcpClients, eq(mcpClients.id, mcpAuthorizationRequests.clientId))
    .where(eq(mcpAuthorizationRequests.id, id))
    .limit(1);
  if (
    !row ||
    row.active !== "active" ||
    row.consumedAt ||
    row.expiresAt <= now
  ) {
    return null;
  }
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    redirectUri: row.redirectUri,
    scopes: scopesOf(row.scopes),
    state: row.state,
    codeChallenge: row.codeChallenge,
    resource: row.resource,
    expiresAt: row.expiresAt,
  };
}

/** User approval creates a grant and a short, one-use PKCE code. */
export async function approveMcpAuthorization(input: {
  requestId: string;
  userId: string;
  now?: Date;
}): Promise<{ request: McpAuthorizationRequest; code: string } | null> {
  const now = input.now ?? new Date();
  const code = randomSecret();
  const codeHash = digest(code);
  const result = await getDb().transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(mcpAuthorizationRequests)
      .where(
        and(
          eq(mcpAuthorizationRequests.id, input.requestId),
          isNull(mcpAuthorizationRequests.consumedAt),
          gt(mcpAuthorizationRequests.expiresAt, now),
        ),
      )
      .for("update");
    if (!request) return null;
    const [client] = await tx
      .select()
      .from(mcpClients)
      .where(
        and(
          eq(mcpClients.id, request.clientId),
          eq(mcpClients.active, "active"),
        ),
      )
      .limit(1);
    if (!client) return null;

    const [grant] = await tx
      .insert(mcpGrants)
      .values({
        userId: input.userId,
        clientId: request.clientId,
        scopes: scopesOf(request.scopes),
        resource: request.resource,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [mcpGrants.userId, mcpGrants.clientId],
        targetWhere: isNull(mcpGrants.revokedAt),
        set: {
          scopes: scopesOf(request.scopes),
          resource: request.resource,
          createdAt: now,
          revokedAt: null,
        },
      })
      .returning({ id: mcpGrants.id });
    if (!grant) throw new Error("MCP grant was not stored");

    // A new consent must not silently upgrade still-live tokens issued under
    // the previous grant scopes. The new code exchange creates the next pair.
    await tx
      .update(mcpTokens)
      .set({ revokedAt: now })
      .where(and(eq(mcpTokens.grantId, grant.id), isNull(mcpTokens.revokedAt)));

    await tx.insert(mcpAuthorizationCodes).values({
      codeHash,
      grantId: grant.id,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
      resource: request.resource,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      createdAt: now,
    });
    await tx
      .update(mcpAuthorizationRequests)
      .set({ userId: input.userId, consumedAt: now })
      .where(eq(mcpAuthorizationRequests.id, request.id));

    return {
      request: await getMcpAuthorizationRequestOutsideTx(request.id, now),
      grantId: grant.id,
    };
  });
  if (!result?.request) return null;
  await recordAudit({
    actorId: input.userId,
    action: "mcp.grant.approved",
    entityType: "mcp_grant",
    entityId: result.grantId,
  });
  return { request: result.request, code };
}

async function getMcpAuthorizationRequestOutsideTx(
  id: string,
  now: Date,
): Promise<McpAuthorizationRequest | null> {
  const [row] = await getDb()
    .select({
      id: mcpAuthorizationRequests.id,
      clientId: mcpAuthorizationRequests.clientId,
      clientName: mcpClients.name,
      redirectUri: mcpAuthorizationRequests.redirectUri,
      scopes: mcpAuthorizationRequests.scopes,
      state: mcpAuthorizationRequests.state,
      codeChallenge: mcpAuthorizationRequests.codeChallenge,
      resource: mcpAuthorizationRequests.resource,
      expiresAt: mcpAuthorizationRequests.expiresAt,
      consumedAt: mcpAuthorizationRequests.consumedAt,
      active: mcpClients.active,
    })
    .from(mcpAuthorizationRequests)
    .innerJoin(mcpClients, eq(mcpClients.id, mcpAuthorizationRequests.clientId))
    .where(eq(mcpAuthorizationRequests.id, id))
    .limit(1);
  if (!row || row.active !== "active" || row.expiresAt <= now) return null;
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    redirectUri: row.redirectUri,
    scopes: scopesOf(row.scopes),
    state: row.state,
    codeChallenge: row.codeChallenge,
    resource: row.resource,
    expiresAt: row.expiresAt,
  };
}

/** Decline only consumes the pending request; no grant is created. */
export async function declineMcpAuthorization(
  requestId: string,
  now = new Date(),
): Promise<McpAuthorizationRequest | null> {
  const pending = await getMcpAuthorizationRequest(requestId, now);
  if (!pending) return null;
  await getDb()
    .update(mcpAuthorizationRequests)
    .set({ consumedAt: now })
    .where(
      and(
        eq(mcpAuthorizationRequests.id, requestId),
        isNull(mcpAuthorizationRequests.consumedAt),
      ),
    );
  return pending;
}

function tokenPair() {
  return { accessToken: randomSecret(), refreshToken: randomSecret() };
}

async function insertTokenPair(
  grantId: string,
  now: Date,
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
) {
  const pair = tokenPair();
  const [row] = await tx
    .insert(mcpTokens)
    .values({
      grantId,
      accessTokenHash: digest(pair.accessToken),
      refreshTokenHash: digest(pair.refreshToken),
      accessExpiresAt: new Date(now.getTime() + ACCESS_TTL_MS),
      refreshExpiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
      createdAt: now,
    })
    .returning({ id: mcpTokens.id });
  if (!row) throw new Error("MCP token pair was not stored");
  return { ...pair, id: row.id };
}

function pkceMatches(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  return (
    createHash("sha256").update(verifier).digest("base64url") === challenge
  );
}

export async function exchangeMcpCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  resource: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const outcome = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .select({
        codeHash: mcpAuthorizationCodes.codeHash,
        grantId: mcpAuthorizationCodes.grantId,
        redirectUri: mcpAuthorizationCodes.redirectUri,
        codeChallenge: mcpAuthorizationCodes.codeChallenge,
        resource: mcpAuthorizationCodes.resource,
        expiresAt: mcpAuthorizationCodes.expiresAt,
        usedAt: mcpAuthorizationCodes.usedAt,
        clientId: mcpGrants.clientId,
        scopes: mcpGrants.scopes,
        revokedAt: mcpGrants.revokedAt,
        active: mcpClients.active,
      })
      .from(mcpAuthorizationCodes)
      .innerJoin(mcpGrants, eq(mcpGrants.id, mcpAuthorizationCodes.grantId))
      .innerJoin(mcpClients, eq(mcpClients.id, mcpGrants.clientId))
      .where(eq(mcpAuthorizationCodes.codeHash, digest(input.code)))
      .for("update");
    if (
      !row ||
      row.usedAt ||
      row.expiresAt <= now ||
      row.revokedAt ||
      row.active !== "active" ||
      row.clientId !== input.clientId ||
      row.redirectUri !== input.redirectUri ||
      row.resource !== input.resource ||
      !pkceMatches(input.codeVerifier, row.codeChallenge)
    ) {
      return null;
    }
    const updated = await tx
      .update(mcpAuthorizationCodes)
      .set({ usedAt: now })
      .where(
        and(
          eq(mcpAuthorizationCodes.codeHash, row.codeHash),
          isNull(mcpAuthorizationCodes.usedAt),
        ),
      )
      .returning({ codeHash: mcpAuthorizationCodes.codeHash });
    if (updated.length !== 1) return null;
    const pair = await insertTokenPair(row.grantId, now, tx);
    await tx
      .update(mcpGrants)
      .set({ lastUsedAt: now })
      .where(eq(mcpGrants.id, row.grantId));
    return { pair, grantId: row.grantId, scopes: scopesOf(row.scopes) };
  });
  if (!outcome) return null;
  return {
    access_token: outcome.pair.accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    refresh_token: outcome.pair.refreshToken,
    scope: outcome.scopes.join(" "),
  };
}

export async function refreshMcpToken(input: {
  refreshToken: string;
  clientId: string;
  resource: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const outcome = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: mcpTokens.id,
        grantId: mcpTokens.grantId,
        replacedById: mcpTokens.replacedById,
        refreshExpiresAt: mcpTokens.refreshExpiresAt,
        revokedAt: mcpTokens.revokedAt,
        resource: mcpGrants.resource,
        clientId: mcpGrants.clientId,
        scopes: mcpGrants.scopes,
        grantRevokedAt: mcpGrants.revokedAt,
        active: mcpClients.active,
      })
      .from(mcpTokens)
      .innerJoin(mcpGrants, eq(mcpGrants.id, mcpTokens.grantId))
      .innerJoin(mcpClients, eq(mcpClients.id, mcpGrants.clientId))
      .where(eq(mcpTokens.refreshTokenHash, digest(input.refreshToken)))
      .for("update");
    if (!row) return null;
    if (row.replacedById) {
      await tx
        .update(mcpGrants)
        .set({ revokedAt: now })
        .where(eq(mcpGrants.id, row.grantId));
      await tx
        .update(mcpTokens)
        .set({ revokedAt: now })
        .where(
          and(eq(mcpTokens.grantId, row.grantId), isNull(mcpTokens.revokedAt)),
        );
      return { reused: true as const };
    }
    if (
      row.revokedAt ||
      row.grantRevokedAt ||
      row.active !== "active" ||
      row.clientId !== input.clientId ||
      row.resource !== input.resource ||
      row.refreshExpiresAt <= now
    ) {
      return null;
    }
    const pair = await insertTokenPair(row.grantId, now, tx);
    await tx
      .update(mcpTokens)
      .set({ replacedById: pair.id })
      .where(eq(mcpTokens.id, row.id));
    await tx
      .update(mcpGrants)
      .set({ lastUsedAt: now })
      .where(eq(mcpGrants.id, row.grantId));
    return { reused: false as const, pair, scopes: scopesOf(row.scopes) };
  });
  if (!outcome || outcome.reused) return null;
  return {
    access_token: outcome.pair.accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    refresh_token: outcome.pair.refreshToken,
    scope: outcome.scopes.join(" "),
  };
}

export async function verifyMcpToken(
  token: string,
  resource: string,
  now = new Date(),
): Promise<McpPrincipal | null> {
  const tokenHash = digest(token);
  const [personal] = await getDb()
    .select({
      id: mcpPersonalTokens.id,
      userId: mcpPersonalTokens.userId,
      scopes: mcpPersonalTokens.scopes,
      resource: mcpPersonalTokens.resource,
      expiresAt: mcpPersonalTokens.expiresAt,
      status: users.status,
      deletedAt: users.deletedAt,
    })
    .from(mcpPersonalTokens)
    .innerJoin(users, eq(users.id, mcpPersonalTokens.userId))
    .where(
      and(
        eq(mcpPersonalTokens.tokenHash, tokenHash),
        isNull(mcpPersonalTokens.revokedAt),
        gt(mcpPersonalTokens.expiresAt, now),
        eq(mcpPersonalTokens.resource, resource),
      ),
    )
    .limit(1);
  if (personal && personal.status === "active" && !personal.deletedAt) {
    await getDb()
      .update(mcpPersonalTokens)
      .set({ lastUsedAt: now })
      .where(eq(mcpPersonalTokens.id, personal.id));
    return {
      userId: personal.userId,
      clientId: `personal:${personal.id}`,
      scopes: scopesOf(personal.scopes),
      expiresAt: Math.floor(personal.expiresAt.getTime() / 1000),
      resource: personal.resource,
    };
  }

  const [oauth] = await getDb()
    .select({
      id: mcpTokens.id,
      grantId: mcpGrants.id,
      userId: mcpGrants.userId,
      clientId: mcpGrants.clientId,
      scopes: mcpGrants.scopes,
      resource: mcpGrants.resource,
      accessExpiresAt: mcpTokens.accessExpiresAt,
      status: users.status,
      deletedAt: users.deletedAt,
      clientActive: mcpClients.active,
    })
    .from(mcpTokens)
    .innerJoin(mcpGrants, eq(mcpGrants.id, mcpTokens.grantId))
    .innerJoin(users, eq(users.id, mcpGrants.userId))
    .innerJoin(mcpClients, eq(mcpClients.id, mcpGrants.clientId))
    .where(
      and(
        eq(mcpTokens.accessTokenHash, tokenHash),
        isNull(mcpTokens.revokedAt),
        isNull(mcpGrants.revokedAt),
        gt(mcpTokens.accessExpiresAt, now),
        eq(mcpClients.active, "active"),
        eq(mcpGrants.resource, resource),
      ),
    )
    .limit(1);
  if (!oauth || oauth.status !== "active" || oauth.deletedAt) return null;
  await getDb()
    .update(mcpGrants)
    .set({ lastUsedAt: now })
    .where(eq(mcpGrants.id, oauth.grantId));
  return {
    userId: oauth.userId,
    clientId: oauth.clientId,
    grantId: oauth.grantId,
    scopes: scopesOf(oauth.scopes),
    expiresAt: Math.floor(oauth.accessExpiresAt.getTime() / 1000),
    resource: oauth.resource,
  };
}

export async function createMcpPersonalToken(input: {
  userId: string;
  label: string;
  scopes: string[];
  resource: string;
  now?: Date;
}) {
  const label = input.label.trim();
  const scopes = [...new Set(input.scopes)];
  if (
    !validResource(input.resource) ||
    label.length < 1 ||
    label.length > 80 ||
    scopes.length === 0 ||
    scopes.some((scope) => !MCP_SCOPES.includes(scope as McpScope))
  ) {
    throw validationError();
  }
  const now = input.now ?? new Date();
  const token = `${PERSONAL_TOKEN_PREFIX}${randomSecret()}`;
  const [row] = await getDb()
    .insert(mcpPersonalTokens)
    .values({
      userId: input.userId,
      label,
      tokenHash: digest(token),
      scopes: scopes as McpScope[],
      resource: input.resource,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    })
    .returning({ id: mcpPersonalTokens.id });
  if (!row) throw new Error("MCP personal token was not stored");
  await recordAudit({
    actorId: input.userId,
    action: "mcp.personal_token.created",
    entityType: "mcp_personal_token",
    entityId: row.id,
  });
  return { id: row.id, token };
}

export async function listMcpPersonalTokens(userId: string) {
  return getDb()
    .select({
      id: mcpPersonalTokens.id,
      label: mcpPersonalTokens.label,
      scopes: mcpPersonalTokens.scopes,
      createdAt: mcpPersonalTokens.createdAt,
      expiresAt: mcpPersonalTokens.expiresAt,
      lastUsedAt: mcpPersonalTokens.lastUsedAt,
    })
    .from(mcpPersonalTokens)
    .where(
      and(
        eq(mcpPersonalTokens.userId, userId),
        isNull(mcpPersonalTokens.revokedAt),
      ),
    )
    .orderBy(desc(mcpPersonalTokens.createdAt));
}

export async function revokeMcpPersonalToken(
  userId: string,
  tokenId: string,
  now = new Date(),
): Promise<boolean> {
  const rows = await getDb()
    .update(mcpPersonalTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(mcpPersonalTokens.id, tokenId),
        eq(mcpPersonalTokens.userId, userId),
        isNull(mcpPersonalTokens.revokedAt),
      ),
    )
    .returning({ id: mcpPersonalTokens.id });
  if (rows.length) {
    await recordAudit({
      actorId: userId,
      action: "mcp.personal_token.revoked",
      entityType: "mcp_personal_token",
      entityId: tokenId,
    });
  }
  return rows.length > 0;
}

export async function listMcpConnections(userId: string) {
  return getDb()
    .select({
      id: mcpGrants.id,
      clientId: mcpGrants.clientId,
      clientName: mcpClients.name,
      scopes: mcpGrants.scopes,
      createdAt: mcpGrants.createdAt,
      lastUsedAt: mcpGrants.lastUsedAt,
    })
    .from(mcpGrants)
    .innerJoin(mcpClients, eq(mcpClients.id, mcpGrants.clientId))
    .where(and(eq(mcpGrants.userId, userId), isNull(mcpGrants.revokedAt)))
    .orderBy(desc(mcpGrants.lastUsedAt));
}

export async function revokeMcpConnection(
  userId: string,
  grantId: string,
  now = new Date(),
): Promise<boolean> {
  const rows = await getDb()
    .update(mcpGrants)
    .set({ revokedAt: now })
    .where(
      and(
        eq(mcpGrants.id, grantId),
        eq(mcpGrants.userId, userId),
        isNull(mcpGrants.revokedAt),
      ),
    )
    .returning({ id: mcpGrants.id });
  if (!rows.length) return false;
  await getDb()
    .update(mcpTokens)
    .set({ revokedAt: now })
    .where(and(eq(mcpTokens.grantId, grantId), isNull(mcpTokens.revokedAt)));
  await recordAudit({
    actorId: userId,
    action: "mcp.connection.revoked",
    entityType: "mcp_grant",
    entityId: grantId,
  });
  return true;
}

export async function revokeMcpToken(rawToken: string): Promise<void> {
  const hash = digest(rawToken);
  const [personal] = await getDb()
    .select({ id: mcpPersonalTokens.id })
    .from(mcpPersonalTokens)
    .where(eq(mcpPersonalTokens.tokenHash, hash))
    .limit(1);
  if (personal) {
    await getDb()
      .update(mcpPersonalTokens)
      .set({ revokedAt: new Date() })
      .where(eq(mcpPersonalTokens.id, personal.id));
    return;
  }
  const [token] = await getDb()
    .select({ grantId: mcpTokens.grantId })
    .from(mcpTokens)
    .where(
      or(
        eq(mcpTokens.refreshTokenHash, hash),
        eq(mcpTokens.accessTokenHash, hash),
      ),
    )
    .limit(1);
  if (token) {
    await getDb()
      .update(mcpGrants)
      .set({ revokedAt: new Date() })
      .where(eq(mcpGrants.id, token.grantId));
    await getDb()
      .update(mcpTokens)
      .set({ revokedAt: new Date() })
      .where(eq(mcpTokens.grantId, token.grantId));
  }
}

export async function enforceMcpUserLimit(
  userId: string,
  clientId: string,
  now = new Date(),
): Promise<void> {
  const rule = { limit: 600, windowSeconds: 24 * 60 * 60 };
  const count = await hit(
    rateKey("mcpUser", `${userId}:${clientId}`),
    rule,
    now,
  );
  if (count > rule.limit) throw rateLimited(retryAfterSeconds(now, rule));
}
