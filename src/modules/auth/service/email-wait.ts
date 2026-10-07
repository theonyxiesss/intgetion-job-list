import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { AppLocale } from "@/i18n/routing";
import {
  getAuthUserLoginEmail,
  magicLinkTokenHash,
} from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import * as waits from "../repo/auth-email-wait";
import type { AuthEmailWaitPurpose } from "../repo/auth-email-wait";
import type { AuthClient, CurrentUser } from "./auth-service";

export const AUTH_EMAIL_WAIT_COOKIE = "auth_email_wait";
export const AUTH_EMAIL_WAIT_TTL_SECONDS = 60 * 60;

function waitHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Starts a PC-side wait and returns the raw token for the email redirect (D328). */
export async function beginEmailWait(
  purpose: AuthEmailWaitPurpose,
  locale: AppLocale,
): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const now = new Date();
  await waits.deleteExpiredAuthEmailWaits(now);
  await waits.insertAuthEmailWait({
    waitHash: waitHash(raw),
    purpose,
    locale,
    expiresAt: new Date(now.getTime() + AUTH_EMAIL_WAIT_TTL_SECONDS * 1000),
  });
  const jar = await cookies();
  jar.set(
    AUTH_EMAIL_WAIT_COOKIE,
    raw,
    cookieOptions(AUTH_EMAIL_WAIT_TTL_SECONDS),
  );
  return raw;
}

/**
 * After the link was opened (often on a phone), mint a one-time handoff so the
 * waiting PC browser can sign in without the person copying anything.
 */
export async function readyEmailWait(
  rawWait: string,
  user: CurrentUser,
): Promise<AuthEmailWaitPurpose | null> {
  const email = await getAuthUserLoginEmail(user.authUid);
  if (!email) return null;
  const handoff = await magicLinkTokenHash(email);
  if (!handoff) return null;
  const row = await waits.markAuthEmailWaitReady(
    waitHash(rawWait),
    handoff,
    new Date(),
  );
  return row?.purpose === "signup" || row?.purpose === "login"
    ? row.purpose
    : null;
}

export type EmailWaitPoll = "signed-in" | "pending" | "absent";

/** PC poll: when the other device confirmed, verify the handoff on this browser. */
export async function claimEmailWait(auth: AuthClient): Promise<EmailWaitPoll> {
  const jar = await cookies();
  const raw = jar.get(AUTH_EMAIL_WAIT_COOKIE)?.value ?? "";
  if (!raw) return "absent";

  const row = await waits.findAuthEmailWait(waitHash(raw));
  const now = new Date();
  if (!row || row.expiresAt.getTime() <= now.getTime()) {
    if (row) await waits.deleteExpiredAuthEmailWaits(now);
    jar.set(AUTH_EMAIL_WAIT_COOKIE, "", cookieOptions(0));
    return "absent";
  }
  if (!row.readyAt || !row.handoffTokenHash) return "pending";

  const tokenHash = await waits.consumeAuthEmailWait(waitHash(raw), now);
  jar.set(AUTH_EMAIL_WAIT_COOKIE, "", cookieOptions(0));
  if (!tokenHash) return "absent";

  const { error } = await auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (error) return "absent";
  return "signed-in";
}

export function signedInPath(locale: AppLocale, purpose: AuthEmailWaitPurpose) {
  return `${siteUrl()}/${locale}/auth/signed-in?kind=${purpose}`;
}
