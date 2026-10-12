import { authCookieOptions } from "./cookie-options";

/**
 * One refresh of a given token at a time, in this process (D398).
 *
 * Supabase rotates the refresh token on every successful call. Two requests
 * that both still hold the old token used to send it twice: the second answer
 * is "already used", and the client then wiped the cookie the first request
 * had just written. Waiters take the session the leader already received.
 * They do not send that refresh again.
 *
 * The remembered body lives only in memory, for a few seconds, and is never
 * logged. A later "already used" with a newer session already in the jar
 * keeps that session. A network failure, a 5xx, and a token that was just
 * rotated do not clear cookies.
 */

const BASE64_PREFIX = "base64-";
const REMEMBER_MS = 15_000;

export type RefreshFailureKind = "transient" | "rotated" | "dead" | "disabled";

export type StoredSession = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: unknown;
};

export type RefreshOutcome = {
  status: number;
  body: string;
  keepCookies: boolean;
};

type JarCookie = { name: string; value: string };

export type IncomingCookie = JarCookie & {
  options?: {
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
    path?: string;
    partitioned?: boolean;
  };
};

export function authStorageKey(supabaseUrl: string): string {
  const host = new URL(supabaseUrl).hostname.split(".")[0] || "auth";
  return `sb-${host}-auth-token`;
}

export function classifyRefreshFailure(
  status: number,
  body: unknown,
): RefreshFailureKind {
  if (status === 0 || status === 408 || status === 429 || status >= 500) {
    return "transient";
  }
  const text = failureText(body);
  if (text.includes("refresh_transient")) return "transient";
  if (
    text.includes("refresh_token_already_used") ||
    text.includes("already used") ||
    text.includes("already been used")
  ) {
    return "rotated";
  }
  if (
    text.includes("user_banned") ||
    text.includes("user is banned") ||
    text.includes("user has been banned") ||
    text.includes("user_disabled")
  ) {
    return "disabled";
  }
  return "dead";
}

/** Transient and "just rotated" must not end the session. */
export function shouldKeepCookies(kind: RefreshFailureKind): boolean {
  return kind === "transient" || kind === "rotated";
}

export function isSessionClear(cookie: {
  value: string;
  options?: { maxAge?: number };
}): boolean {
  return cookie.value === "" || cookie.options?.maxAge === 0;
}

/** Same Max-Age and flags as `authCookieOptions`, including split chunks. */
export function sessionCookieOptions(framed: boolean, clearing: boolean) {
  const base = authCookieOptions(framed ? { framed: true } : {});
  return {
    ...base,
    httpOnly: true as const,
    maxAge: clearing ? 0 : base.maxAge,
  };
}

function cookieFamily(name: string): string {
  return name.replace(/\.(0|[1-9][0-9]*)$/, "");
}

/**
 * Every `sb-*` chunk is written or cleared with the session flags. A clear
 * also covers sibling chunks (`.0`, `.1`) that are still in the jar.
 */
export function normalizeSessionCookies(
  cookies: IncomingCookie[],
  jar: JarCookie[],
  framed: boolean,
): IncomingCookie[] {
  const normalized: IncomingCookie[] = cookies.map((cookie) => {
    if (!cookie.name.startsWith("sb-")) return cookie;
    const clearing = isSessionClear(cookie);
    return {
      name: cookie.name,
      value: clearing ? "" : cookie.value,
      options: sessionCookieOptions(framed, clearing),
    };
  });

  const families = new Set(
    normalized
      .filter(
        (cookie) => cookie.name.startsWith("sb-") && isSessionClear(cookie),
      )
      .map((cookie) => cookieFamily(cookie.name)),
  );
  if (families.size === 0) return normalized;

  const present = new Set(normalized.map((cookie) => cookie.name));
  for (const existing of jar) {
    if (!existing.name.startsWith("sb-") || present.has(existing.name)) {
      continue;
    }
    if (!families.has(cookieFamily(existing.name))) continue;
    normalized.push({
      name: existing.name,
      value: "",
      options: sessionCookieOptions(framed, true),
    });
    present.add(existing.name);
  }
  return normalized;
}

export function readStoredSession(
  cookies: JarCookie[],
  storageKey: string,
): StoredSession | null {
  const raw = combinedCookie(cookies, storageKey);
  if (!raw) return null;
  const json = raw.startsWith(BASE64_PREFIX)
    ? decodeBase64Url(raw.slice(BASE64_PREFIX.length))
    : raw;
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as StoredSession;
    if (!parsed?.access_token || !parsed.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** A session already in the jar, and not the refresh we just sent. */
export function newerSessionBody(
  cookies: JarCookie[],
  storageKey: string,
  usedRefreshToken: string,
): string | null {
  const session = readStoredSession(cookies, storageKey);
  if (!session?.refresh_token || session.refresh_token === usedRefreshToken) {
    return null;
  }
  return tokenBodyFromSession(session);
}

export function tokenBodyFromSession(session: StoredSession): string | null {
  if (!session.access_token || !session.refresh_token) return null;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? now + 3600;
  const expiresIn = session.expires_in ?? Math.max(1, expiresAt - now);
  return JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: expiresIn,
    expires_at: expiresAt,
    token_type: session.token_type ?? "bearer",
    user: session.user ?? null,
  });
}

const inflight = new Map<string, Promise<RefreshOutcome>>();
const remembered = new Map<string, { at: number; body: string }>();

export function resetSessionRefreshForTests(): void {
  inflight.clear();
  remembered.clear();
}

export function coordinateRefresh(
  refreshToken: string,
  send: () => Promise<{ status: number; body: string }>,
  readNewer: () => string | null,
): Promise<RefreshOutcome> {
  const cached = recalled(refreshToken);
  if (cached) return Promise.resolve(outcomeFrom(200, cached));

  const existing = inflight.get(refreshToken);
  if (existing) return existing;

  const flight = runRefresh(refreshToken, send, readNewer);
  inflight.set(refreshToken, flight);
  return flight;
}

async function runRefresh(
  refreshToken: string,
  send: () => Promise<{ status: number; body: string }>,
  readNewer: () => string | null,
): Promise<RefreshOutcome> {
  try {
    const result = await send();
    if (result.status >= 200 && result.status < 300) {
      remember(refreshToken, result.body);
      return outcomeFrom(result.status, result.body);
    }
    const parsed = safeJson(result.body);
    if (classifyRefreshFailure(result.status, parsed) === "rotated") {
      const again = recalled(refreshToken);
      if (again) return outcomeFrom(200, again);
      const newer = readNewer();
      if (newer) {
        remember(refreshToken, newer);
        return outcomeFrom(200, newer);
      }
    }
    return outcomeFrom(result.status, result.body);
  } finally {
    inflight.delete(refreshToken);
  }
}

function outcomeFrom(status: number, body: string): RefreshOutcome {
  if (status >= 200 && status < 300) {
    return { status, body, keepCookies: false };
  }
  return {
    status,
    body,
    keepCookies: shouldKeepCookies(
      classifyRefreshFailure(status, safeJson(body)),
    ),
  };
}

function remember(token: string, body: string): void {
  remembered.set(token, { at: Date.now(), body });
}

function recalled(token: string): string | null {
  const hit = remembered.get(token);
  if (!hit) return null;
  if (Date.now() - hit.at > REMEMBER_MS) {
    remembered.delete(token);
    return null;
  }
  return hit.body;
}

function failureText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  return [
    record.error_code,
    record.code,
    record.msg,
    record.message,
    record.error,
    record.error_description,
  ]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();
}

function safeJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function combinedCookie(cookies: JarCookie[], key: string): string | null {
  const direct = cookies.find((cookie) => cookie.name === key);
  if (direct?.value) return direct.value;
  const parts: string[] = [];
  for (let index = 0; ; index += 1) {
    const chunk = cookies.find((cookie) => cookie.name === `${key}.${index}`);
    if (!chunk?.value) break;
    parts.push(chunk.value);
  }
  return parts.length > 0 ? parts.join("") : null;
}

function decodeBase64Url(value: string): string | null {
  try {
    const pad =
      value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
    if (typeof Buffer !== "undefined") {
      return Buffer.from(base64, "base64").toString("utf8");
    }
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
