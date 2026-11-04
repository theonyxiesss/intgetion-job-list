import {
  OAuthError,
  OAuthErrorCode,
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import {
  rateLimited,
  readBodyLimited,
  toErrorResponse,
  validationError,
} from "@/lib/http";
import { hit, rateKey, retryAfterSeconds } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { siteUrl } from "@/lib/supabase/env";
import {
  createMcpAuthorizationRequest,
  exchangeMcpCode,
  isValidMcpResource,
  refreshMcpToken,
  registerMcpClient,
  revokeMcpToken,
} from "./auth-service";
import { allowedHosts, allowedOrigins } from "./server";

const REQUEST_COOKIE = "intg_mcp_request";
const OAUTH_MAX_BODY = 16 * 1024;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

function oauthError(error: OAuthError) {
  return json(error.toResponseObject(), 400);
}

async function throttle(request: Request, bucket: string, limit: number) {
  const rule = { limit, windowSeconds: 60 };
  const ip = clientIp(request.headers);
  const count = await hit(rateKey(bucket, ip), rule);
  if (count > limit) throw rateLimited(retryAfterSeconds(new Date(), rule));
}

async function bodyJson(request: Request) {
  const bytes = await readBodyLimited(request, OAUTH_MAX_BODY);
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw validationError();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw validationError();
  return parsed as Record<string, unknown>;
}

async function bodyForm(request: Request) {
  const bytes = await readBodyLimited(request, OAUTH_MAX_BODY);
  return new URLSearchParams(new TextDecoder().decode(bytes));
}

function redirectToConsent(request: Request, id: string) {
  const destination = new URL("/oauth/consent", siteUrl());
  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.toString(),
      "Cache-Control": "no-store",
      "Set-Cookie": `${REQUEST_COOKIE}=${encodeURIComponent(id)}; Path=/; HttpOnly${new URL(request.url).protocol === "https:" ? "; Secure" : ""}; SameSite=Lax; Max-Age=300`,
    },
  });
}

export function mcpAuthorizationCookieName() {
  return REQUEST_COOKIE;
}

/** OAuth endpoints share the MCP path so server-to-server POSTs pass the route's Origin policy. */
export async function handleMcpOAuthRequest(
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);
  const action = url.searchParams.get("oauth");
  if (!action) return null;
  const hostRejected = hostHeaderValidationResponse(request, allowedHosts());
  const originRejected = originValidationResponse(request, allowedOrigins());
  if (hostRejected) return hostRejected;
  if (originRejected) return originRejected;
  try {
    if (action === "authorize" && request.method === "GET") {
      await throttle(request, "mcpAuthorize", 30);
      const clientId = url.searchParams.get("client_id") ?? "";
      const redirectUri = url.searchParams.get("redirect_uri") ?? "";
      const codeChallenge = url.searchParams.get("code_challenge") ?? "";
      const method = url.searchParams.get("code_challenge_method");
      const resource =
        url.searchParams.get("resource") ?? new URL("/api/mcp", url).toString();
      const scopes = (url.searchParams.get("scope") ?? "")
        .split(/\s+/)
        .filter(Boolean);
      if (
        method !== "S256" ||
        !isValidMcpResource(resource) ||
        resource !== new URL("/api/mcp", request.url).toString()
      ) {
        return oauthError(
          new OAuthError(
            OAuthErrorCode.InvalidRequest,
            "Invalid PKCE method or resource",
          ),
        );
      }
      const requestId = await createMcpAuthorizationRequest({
        clientId,
        redirectUri,
        scopes,
        state: url.searchParams.get("state"),
        codeChallenge,
        resource,
      });
      return redirectToConsent(request, requestId);
    }
    if (action === "register" && request.method === "POST") {
      await throttle(request, "mcpRegister", 20);
      const body = await bodyJson(request);
      const name = typeof body.client_name === "string" ? body.client_name : "";
      const redirectUris = Array.isArray(body.redirect_uris)
        ? body.redirect_uris.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      const client = await registerMcpClient({
        name,
        redirectUris,
        metadata: body,
      });
      return json(
        {
          client_id: client.id,
          client_name: client.name,
          redirect_uris: client.redirectUris,
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
        },
        201,
      );
    }
    if (action === "token" && request.method === "POST") {
      await throttle(request, "mcpToken", 60);
      const body = await bodyForm(request);
      const clientId = body.get("client_id") ?? "";
      const resource = body.get("resource") ?? "";
      if (!isValidMcpResource(resource)) {
        return oauthError(
          new OAuthError(OAuthErrorCode.InvalidRequest, "Invalid resource"),
        );
      }
      if (body.get("grant_type") === "authorization_code") {
        const token = await exchangeMcpCode({
          code: body.get("code") ?? "",
          clientId,
          redirectUri: body.get("redirect_uri") ?? "",
          codeVerifier: body.get("code_verifier") ?? "",
          resource,
        });
        return token
          ? json(token)
          : oauthError(
              new OAuthError(
                OAuthErrorCode.InvalidGrant,
                "Invalid authorization code",
              ),
            );
      }
      if (body.get("grant_type") === "refresh_token") {
        const token = await refreshMcpToken({
          refreshToken: body.get("refresh_token") ?? "",
          clientId,
          resource,
        });
        return token
          ? json(token)
          : oauthError(
              new OAuthError(
                OAuthErrorCode.InvalidGrant,
                "Invalid refresh token",
              ),
            );
      }
      return oauthError(
        new OAuthError(
          OAuthErrorCode.UnsupportedGrantType,
          "Unsupported grant type",
        ),
      );
    }
    if (action === "revoke" && request.method === "POST") {
      await throttle(request, "mcpRevoke", 60);
      const body = await bodyForm(request);
      const token = body.get("token");
      if (token) await revokeMcpToken(token);
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return json({ error: "not_found" }, 404);
  } catch (error) {
    if (OAuthError.isInstance(error)) return oauthError(error);
    return toErrorResponse(error);
  }
}

export function oauthMetadata(site = siteUrl()) {
  const base = `${site}/api/mcp`;
  return {
    issuer: site,
    authorization_endpoint: `${base}?oauth=authorize`,
    token_endpoint: `${base}?oauth=token`,
    registration_endpoint: `${base}?oauth=register`,
    revocation_endpoint: `${base}?oauth=revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    client_id_metadata_document_supported: true,
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [
      "profile:read",
      "applications:read",
      "saved:read",
      "freelance:read",
      "ugc:read",
      "reminders:read",
    ],
  };
}

export function protectedResourceMetadata(site = siteUrl()) {
  return {
    resource: `${site}/api/mcp`,
    authorization_servers: [site],
    bearer_methods_supported: ["header"],
    scopes_supported: oauthMetadata(site).scopes_supported,
  };
}
