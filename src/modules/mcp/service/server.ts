import {
  bearerAuthChallengeResponse,
  createMcpHandler,
  hostHeaderValidationResponse,
  McpServer,
  OAuthError,
  OAuthErrorCode,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { PRODUCT_NAME } from "@/config/product";
import { HttpError, toErrorResponse } from "@/lib/http";
import { logger } from "@/lib/logger";
import { privacyHash } from "@/lib/privacy-hash";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { siteUrl } from "@/lib/supabase/env";
import { mcpTools, runMcpTool, UNTRUSTED_NOTE } from "@/modules/bot/service";
import {
  enforceMcpUserLimit,
  verifyMcpToken,
  type McpPrincipal,
} from "./auth-service";
import { runUserMcpTool, userMcpTools } from "./user-tools";

/**
 * MCP server of INTGETION JOB LIST: public and scoped account reads over
 * stateless Streamable HTTP. Public tools come from the Spoki registry;
 * account tools are registered only after scoped bearer-token validation.
 * Cookie sessions are never read and no write tools are exposed.
 */

export const MCP_SERVER_NAME = "intgetion";
export const MCP_SERVER_VERSION = "1.0.0";
/** A JSON-RPC call is small; anything bigger is refused before parsing. */
export const MCP_MAX_BODY_BYTES = 64 * 1024;

const INSTRUCTIONS = [
  `${PRODUCT_NAME}: remote-first jobs, ready freelance services and tech events.`,
  "All tools are read-only. To apply, order or pay, send the person to the url in the result.",
  "Contacts of people are never shared. Imported jobs name their source; follow its link.",
  UNTRUSTED_NOTE,
].join(" ");

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function hostnameOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];

/** Hosts this endpoint answers on: the site, and loopback outside production. */
export function allowedHosts(): string[] {
  const site = hostnameOf(siteUrl());
  return process.env.NODE_ENV === "production" ? [site] : [site, ...LOOPBACK];
}

/** A browser may call only from this site; servers send no Origin at all. */
export function allowedOrigins(): string[] {
  return allowedHosts();
}

function ipHashOf(request: Request): string | undefined {
  try {
    return privacyHash(clientIp(request.headers));
  } catch {
    return undefined;
  }
}

/**
 * One log line per tool call: the tool, the outcome and the time. Never the
 * arguments (a search text can be personal) and never the raw IP.
 */
function logCall(input: {
  tool: string;
  ok: boolean;
  ms: number;
  ipHash?: string;
  code?: string;
}) {
  logger.info({ event: "mcp_tool_call", ...input });
}

function buildServer(
  ipHash: string | undefined,
  principal?: McpPrincipal,
): McpServer {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, title: PRODUCT_NAME, version: MCP_SERVER_VERSION },
    {
      instructions: INSTRUCTIONS,
      // The tool list changes only with a deploy, so there is nothing to
      // push. Without this the SDK advertises listChanged, and a client's
      // subscriptions/listen stream holds the function open on Vercel until
      // maxDuration. With it the stream is acknowledged empty and closed.
      capabilities: { tools: { listChanged: false } },
    },
  );
  for (const definition of mcpTools()) {
    server.registerTool(
      definition.name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.input,
        annotations: { title: definition.title, ...READ_ONLY },
      },
      async (args: unknown) => {
        const started = performance.now();
        try {
          const result = await runMcpTool(definition.name, args);
          logCall({
            tool: definition.name,
            ok: true,
            ms: Math.round(performance.now() - started),
            ipHash,
          });
          return {
            content: [{ type: "text" as const, text: result.text }],
            structuredContent: result.data,
          };
        } catch (error) {
          logCall({
            tool: definition.name,
            ok: false,
            ms: Math.round(performance.now() - started),
            ipHash,
            code: error instanceof HttpError ? error.code : "INTERNAL",
          });
          if (error instanceof HttpError && error.status === 400) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: error.message }],
            };
          }
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: "The tool failed. Try again later.",
              },
            ],
          };
        }
      },
    );
  }
  if (principal) {
    for (const definition of userMcpTools(principal)) {
      server.registerTool(
        definition.name,
        {
          title: definition.title,
          description: definition.description,
          inputSchema: definition.input,
          annotations: { title: definition.title, ...READ_ONLY },
        },
        async (args: unknown) => {
          const started = performance.now();
          try {
            const data = await runUserMcpTool(definition.name, args, principal);
            logCall({
              tool: definition.name,
              ok: true,
              ms: Math.round(performance.now() - started),
              ipHash,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${UNTRUSTED_NOTE}\n${JSON.stringify(data)}`,
                },
              ],
              structuredContent: data,
            };
          } catch (error) {
            logCall({
              tool: definition.name,
              ok: false,
              ms: Math.round(performance.now() - started),
              ipHash,
              code: error instanceof HttpError ? error.code : "INTERNAL",
            });
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text:
                    error instanceof HttpError
                      ? error.message
                      : "The tool failed. Try again later.",
                },
              ],
            };
          }
        },
      );
    }
  }
  return server;
}

const handler = createMcpHandler(
  ({ requestInfo, authInfo }) => {
    const userId = authInfo?.extra?.userId;
    const principal =
      authInfo && typeof userId === "string"
        ? {
            userId,
            clientId: authInfo.clientId,
            scopes: authInfo.scopes as McpPrincipal["scopes"],
            expiresAt: authInfo.expiresAt ?? 0,
            resource: authInfo.resource?.toString() ?? "",
            ...(typeof authInfo.extra?.grantId === "string"
              ? { grantId: authInfo.extra.grantId }
              : {}),
          }
        : undefined;
    return buildServer(
      requestInfo ? ipHashOf(requestInfo) : undefined,
      principal,
    );
  },
  {
    // Default "auto": one JSON body; tools here never send progress first.
    maxRequestBodySize: MCP_MAX_BODY_BYTES,
    // Reporting only: the error name, never its message (it can quote input).
    onerror: (error) => logger.warn({ event: "mcp_error", name: error.name }),
  },
);

/**
 * `/api/mcp`. Order: Host and Origin (DNS rebinding, forged browser calls),
 * then the per-IP limit, then the protocol. Nothing here reads cookies.
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
  const rejected =
    hostHeaderValidationResponse(request, allowedHosts()) ??
    originValidationResponse(request, allowedOrigins());
  if (rejected) return rejected;
  try {
    const authorization = request.headers.get("authorization");
    if (authorization) {
      const [scheme, token, ...extra] = authorization.split(" ");
      if (scheme?.toLowerCase() !== "bearer" || !token || extra.length) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "Invalid access token",
        );
      }
      const resource = new URL("/api/mcp", request.url).toString();
      const principal = await verifyMcpToken(token, resource);
      if (!principal) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "Invalid access token",
        );
      }
      await enforceMcpUserLimit(principal.userId, principal.clientId);
      return handler.fetch(request, {
        authInfo: {
          token,
          clientId: principal.clientId,
          scopes: principal.scopes,
          expiresAt: principal.expiresAt,
          resource: new URL(principal.resource),
          extra: { userId: principal.userId, grantId: principal.grantId },
        },
      });
    }
    await enforceRateLimit("mcpGuest", clientIp(request.headers));
  } catch (error) {
    if (OAuthError[Symbol.hasInstance](error)) {
      return bearerAuthChallengeResponse(error, {
        resourceMetadataUrl: `${siteUrl()}/.well-known/oauth-protected-resource/api/mcp`,
      });
    }
    return toErrorResponse(error);
  }
  return handler.fetch(request);
}
