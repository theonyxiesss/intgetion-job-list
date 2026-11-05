import { createHash, randomBytes, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  auditLogs,
  mcpAuthorizationCodes,
  mcpClients,
  mcpTokens,
  users,
} from "@/db/schema";
import {
  approveMcpAuthorization,
  createMcpAuthorizationRequest,
  exchangeMcpCode,
  refreshMcpToken,
  registerMcpClient,
  verifyMcpToken,
} from "../service";

const userId = randomUUID();
const authUid = randomUUID();
const redirectUri = "http://127.0.0.1:43123/callback";
const resource = "https://intgetion.com/api/mcp";
let clientId = "";

beforeAll(async () => {
  await getDb()
    .insert(users)
    .values({
      id: userId,
      authUid,
      termsAcceptedAt: new Date("2026-10-03T10:00:00.000Z"),
      termsVersion: "2026-10-03",
      locale: "en",
    });
  const client = await registerMcpClient({
    name: "MCP integration test",
    redirectUris: [redirectUri],
    metadata: { source: "integration-test" },
  });
  clientId = client.id;
}, 30_000);

afterAll(async () => {
  if (clientId) {
    // Break the self-reference before the client's cascade removes token rows.
    await getDb().execute(sql`
      update public.mcp_tokens
      set replaced_by_id = null
      where grant_id in (
        select id from public.mcp_grants where client_id = ${clientId}
      )
    `);
    await getDb().delete(mcpClients).where(eq(mcpClients.id, clientId));
  }
  await getDb().delete(auditLogs).where(eq(auditLogs.actorId, userId));
  await getDb().delete(users).where(eq(users.id, userId));
}, 30_000);

describe("MCP OAuth authorization against Postgres", () => {
  it("exchanges one PKCE code, rotates refresh tokens and revokes a reused chain", async () => {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const requestId = await createMcpAuthorizationRequest({
      clientId,
      redirectUri,
      scopes: ["profile:read", "applications:read"],
      state: "integration-state",
      codeChallenge: challenge,
      resource,
    });

    const approved = await approveMcpAuthorization({ requestId, userId });
    expect(approved?.request).toMatchObject({
      clientId,
      clientName: "MCP integration test",
      redirectUri,
      scopes: ["profile:read", "applications:read"],
      state: "integration-state",
    });
    expect(approved?.code).toBeTruthy();
    expect(await approveMcpAuthorization({ requestId, userId })).toBeNull();

    const wrongVerifier = await exchangeMcpCode({
      code: approved!.code,
      clientId,
      redirectUri,
      codeVerifier: `${verifier}wrong`,
      resource,
    });
    expect(wrongVerifier).toBeNull();
    expect(
      await exchangeMcpCode({
        code: approved!.code,
        clientId,
        redirectUri: `${redirectUri}/changed`,
        codeVerifier: verifier,
        resource,
      }),
    ).toBeNull();
    expect(
      await exchangeMcpCode({
        code: approved!.code,
        clientId: `${clientId}-wrong`,
        redirectUri,
        codeVerifier: verifier,
        resource,
      }),
    ).toBeNull();
    expect(
      await exchangeMcpCode({
        code: approved!.code,
        clientId,
        redirectUri,
        codeVerifier: verifier,
        resource: "https://other.example/api/mcp",
      }),
    ).toBeNull();

    const firstPair = await exchangeMcpCode({
      code: approved!.code,
      clientId,
      redirectUri,
      codeVerifier: verifier,
      resource,
    });
    expect(firstPair).toMatchObject({
      token_type: "Bearer",
      scope: "profile:read applications:read",
    });
    expect(firstPair?.access_token).not.toBe(firstPair?.refresh_token);

    const principal = await verifyMcpToken(firstPair!.access_token, resource);
    expect(principal).toMatchObject({
      userId,
      clientId,
      scopes: ["profile:read", "applications:read"],
      resource,
    });
    if (!principal?.grantId) throw new Error("OAuth grant was not issued");

    const [codeRow] = await getDb()
      .select({ codeHash: mcpAuthorizationCodes.codeHash })
      .from(mcpAuthorizationCodes)
      .where(eq(mcpAuthorizationCodes.grantId, principal.grantId));
    expect(codeRow?.codeHash).toBe(
      createHash("sha256").update(approved!.code, "utf8").digest("hex"),
    );
    expect(codeRow?.codeHash).not.toBe(approved!.code);

    const tokenRows = await getDb()
      .select({
        accessTokenHash: mcpTokens.accessTokenHash,
        refreshTokenHash: mcpTokens.refreshTokenHash,
      })
      .from(mcpTokens)
      .where(eq(mcpTokens.grantId, principal.grantId));
    expect(tokenRows).toHaveLength(1);
    expect(tokenRows[0]?.accessTokenHash).toBe(
      createHash("sha256")
        .update(firstPair!.access_token, "utf8")
        .digest("hex"),
    );
    expect(tokenRows[0]?.refreshTokenHash).toBe(
      createHash("sha256")
        .update(firstPair!.refresh_token, "utf8")
        .digest("hex"),
    );

    expect(
      await exchangeMcpCode({
        code: approved!.code,
        clientId,
        redirectUri,
        codeVerifier: verifier,
        resource,
      }),
    ).toBeNull();

    const rotatedPair = await refreshMcpToken({
      refreshToken: firstPair!.refresh_token,
      clientId,
      resource,
    });
    expect(rotatedPair?.access_token).toBeTruthy();
    expect(rotatedPair?.refresh_token).toBeTruthy();
    expect(
      await verifyMcpToken(rotatedPair!.access_token, resource),
    ).toMatchObject({ userId, clientId });

    // Replaying the previous refresh token revokes the full grant chain.
    expect(
      await refreshMcpToken({
        refreshToken: firstPair!.refresh_token,
        clientId,
        resource,
      }),
    ).toBeNull();
    expect(
      await verifyMcpToken(rotatedPair!.access_token, resource),
    ).toBeNull();
  }, 30_000);
});
