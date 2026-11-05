import { reportWarning } from "@/lib/logger";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase Auth reachability (D606). One rule for every sign-in path and
 * for `/api/health`: no answer (status 0), 402 (project restricted, for
 * example `exceed_egress_quota`) or any 5xx means Auth is down for
 * everyone, not that this person typed something wrong.
 */
export function isAuthOutageStatus(status: number | undefined): boolean {
  if (status === undefined) return false;
  return status === 0 || status === 402 || status >= 500;
}

export type AuthHealth = "up" | "down";

const CACHE_MS = 30_000;
const TIMEOUT_MS = 3_000;

let cached: { at: number; value: AuthHealth } | null = null;

/** Forgets the cached answer (tests). */
export function resetAuthHealthCache(): void {
  cached = null;
}

/**
 * GET `/auth/v1/health` with the public anon key. The answer is cached for
 * 30 s per instance, so a busy `/api/health` or a burst of failed sign-ins
 * does not add load (or egress) to a struggling Auth. Only the HTTP status
 * is logged; the provider's text and the URL stay out of the response.
 */
export async function checkAuthHealth(
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<AuthHealth> {
  if (cached && now - cached.at < CACHE_MS) return cached.value;
  let value: AuthHealth;
  try {
    const response = await fetchImpl(`${supabaseUrl()}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey() },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    value = response.ok ? "up" : "down";
    if (!response.ok) {
      reportWarning({ status: response.status }, "auth health: not ok");
    }
  } catch (error) {
    value = "down";
    reportWarning(
      { err: error instanceof Error ? error.name : typeof error },
      "auth health: no answer",
    );
  }
  cached = { at: now, value };
  return value;
}
