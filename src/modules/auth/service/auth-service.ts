import type { EmailOtpType, SupabaseClient, User } from "@supabase/supabase-js";
import { TERMS_VERSION } from "@/config/legal";
import type { AppLocale } from "@/i18n/routing";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  createConfirmedAuthUser,
  magicLinkTokenHash,
} from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import {
  HttpError,
  errorCodes,
  unauthenticated,
  validationError,
} from "@/lib/http";
import * as usersRepo from "../repo/users";
import {
  signupMetadata,
  type LoginInput,
  type MagicLinkInput,
  type NewPasswordInput,
  type RegisterInput,
  type ResetInput,
  type SignupMetadata,
  type UpdateMeInput,
} from "../schemas";
import {
  decodeTelegramResult,
  telegramEmail,
  verifyTelegramAuth,
} from "./telegram";

export type AuthClient = Pick<
  SupabaseClient["auth"],
  | "signUp"
  | "signInWithOtp"
  | "resetPasswordForEmail"
  | "exchangeCodeForSession"
  | "verifyOtp"
  | "getUser"
  | "signOut"
  | "updateUser"
  | "signInWithPassword"
>;

export type CurrentUser = usersRepo.UserRow;

export function callbackUrl(locale: AppLocale, next?: "reset"): string {
  const url = new URL(`${siteUrl()}/${locale}/auth/callback`);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

/** An auth user counts as signed in only after the email is confirmed (16.1). */
export function isEmailConfirmed(user: Pick<User, "email_confirmed_at">) {
  return Boolean(user.email_confirmed_at);
}

function authFailure(error: { status?: number; code?: string }): HttpError {
  if (error.status === 429) {
    return new HttpError(429, errorCodes.rateLimited, "Too many requests");
  }
  if (error.code === "weak_password") {
    return validationError([{ path: ["password"], message: "password_weak" }]);
  }
  return new HttpError(502, "AUTH_PROVIDER_ERROR", "Auth provider error");
}

/**
 * Starts registration. The `users` row is created by the callback, after the
 * email is confirmed; until then terms and locale live in user metadata.
 */
export async function register(
  auth: AuthClient,
  input: RegisterInput,
  now: Date = new Date(),
): Promise<void> {
  const data: SignupMetadata = {
    terms_version: TERMS_VERSION,
    terms_accepted_at: now.toISOString(),
    locale: input.locale,
  };
  const emailRedirectTo = callbackUrl(input.locale);
  const { error } = input.password
    ? await auth.signUp({
        email: input.email,
        password: input.password,
        options: { emailRedirectTo, data },
      })
    : await auth.signInWithOtp({
        email: input.email,
        options: { shouldCreateUser: true, emailRedirectTo, data },
      });
  // An existing address gets the same answer as a new one (anti-enumeration).
  if (error && error.code !== "user_already_exists") throw authFailure(error);
}

/**
 * Password sign-in on the server, so it can be rate limited (D38).
 * Wrong credentials and an unconfirmed email are both 401; `details.reason`
 * tells the form which message to show.
 */
export async function signIn(
  auth: AuthClient,
  input: LoginInput,
): Promise<CurrentUser> {
  const { data, error } = await auth.signInWithPassword(input);
  if (error) {
    if (error.status === 429) throw authFailure(error);
    const reason =
      error.code === "email_not_confirmed"
        ? "email_not_confirmed"
        : "invalid_credentials";
    throw new HttpError(401, errorCodes.unauthenticated, "Sign-in failed", {
      reason,
    });
  }
  const row = data.user
    ? await usersRepo.findUserByAuthUid(data.user.id)
    : undefined;
  if (!row || row.status !== "active" || !isEmailConfirmed(data.user)) {
    await auth.signOut();
    throw new HttpError(401, errorCodes.unauthenticated, "Sign-in failed", {
      reason: "invalid_credentials",
    });
  }
  return row;
}

/** Sign-in link for an existing account. Unknown addresses look the same. */
export async function sendMagicLink(
  auth: AuthClient,
  input: MagicLinkInput,
): Promise<void> {
  const { error } = await auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: callbackUrl(input.locale),
    },
  });
  if (error?.status === 429) throw authFailure(error);
}

/** Section 16.1: admin sign-ins are audited. Others are not recorded. */
export async function auditSignIn(
  user: CurrentUser,
  method: "password" | "email_link" | "telegram",
  ip: string,
): Promise<void> {
  if (user.platformRole !== "admin") return;
  await recordAudit({
    actorId: user.id,
    action: "auth.admin_sign_in",
    entityType: "user",
    entityId: user.id,
    diff: { method },
    ip,
  });
}

/** Always succeeds from the caller's point of view (anti-enumeration). */
export async function requestPasswordReset(
  auth: AuthClient,
  input: ResetInput,
): Promise<void> {
  const { error } = await auth.resetPasswordForEmail(input.email, {
    redirectTo: callbackUrl(input.locale, "reset"),
  });
  if (error) {
    logger.warn({ code: error.code }, "password reset request failed");
  }
}

export type CallbackParams = {
  code?: string | null;
  tokenHash?: string | null;
  type?: string | null;
};

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "magiclink",
  "recovery",
  "email",
  "invite",
  "email_change",
]);

export type CallbackResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: "invalid_link" | "missing_terms" };

/**
 * `/auth/callback`: turns the email link into a session, then makes sure the
 * `users` row exists. `code` is the PKCE flow; `token_hash` is the OTP flow.
 */
export async function completeCallback(
  auth: AuthClient,
  params: CallbackParams,
): Promise<CallbackResult> {
  if (params.code) {
    const { error } = await auth.exchangeCodeForSession(params.code);
    if (error) return { ok: false, reason: "invalid_link" };
  } else if (params.tokenHash && params.type) {
    const type = params.type as EmailOtpType;
    if (!otpTypes.has(type)) return { ok: false, reason: "invalid_link" };
    const { error } = await auth.verifyOtp({
      token_hash: params.tokenHash,
      type,
    });
    if (error) return { ok: false, reason: "invalid_link" };
  } else {
    return { ok: false, reason: "invalid_link" };
  }

  const { data, error } = await auth.getUser();
  if (error || !data.user || !isEmailConfirmed(data.user)) {
    return { ok: false, reason: "invalid_link" };
  }

  const existing = await usersRepo.findUserByAuthUid(data.user.id);
  if (existing) return { ok: true, user: existing };

  const metadata = signupMetadata.safeParse(data.user.user_metadata);
  if (!metadata.success) {
    await auth.signOut();
    return { ok: false, reason: "missing_terms" };
  }
  const user = await usersRepo.insertUserIfMissing(data.user.id, metadata.data);
  return { ok: true, user };
}

/**
 * The signed-in user, or null. Unconfirmed emails, missing `users` rows and
 * non-active accounts all count as no session.
 */
export async function getCurrentUser(
  auth: AuthClient,
): Promise<CurrentUser | null> {
  const { data, error } = await auth.getUser();
  if (error || !data.user || !isEmailConfirmed(data.user)) return null;
  const row = await usersRepo.findUserByAuthUid(data.user.id);
  if (!row || row.status !== "active") return null;
  return row;
}

export async function requireCurrentUser(
  auth: AuthClient,
): Promise<CurrentUser> {
  const user = await getCurrentUser(auth);
  if (!user) throw unauthenticated();
  return user;
}

export async function updateMe(
  user: CurrentUser,
  input: UpdateMeInput,
): Promise<CurrentUser> {
  return usersRepo.updateUser(user.id, input);
}

/** Sets a new password for the signed-in user (recovery flow). */
export async function changePassword(
  auth: AuthClient,
  input: NewPasswordInput,
): Promise<void> {
  await requireCurrentUser(auth);
  const { error } = await auth.updateUser({ password: input.password });
  if (error) throw authFailure(error);
}

function telegramFailed(): HttpError {
  return new HttpError(401, errorCodes.unauthenticated, "Sign-in failed", {
    reason: "telegram_failed",
  });
}

/**
 * Telegram sign-in (D217): checks the signed `tgAuthResult`, creates the
 * auth user on the first visit (placeholder email, terms accepted by
 * continuing) and opens a session through a one-time magic-link token.
 */
export async function signInWithTelegram(
  auth: AuthClient,
  input: { result: string; locale: AppLocale },
  botToken: string,
  now: Date = new Date(),
): Promise<CurrentUser> {
  const telegram = verifyTelegramAuth(
    decodeTelegramResult(input.result),
    botToken,
    now,
  );
  if (!telegram) throw telegramFailed();

  const email = telegramEmail(telegram.id);
  const metadata: SignupMetadata = {
    terms_version: TERMS_VERSION,
    terms_accepted_at: now.toISOString(),
    locale: input.locale,
  };
  const created = await createConfirmedAuthUser(email, {
    ...metadata,
    telegram_id: telegram.id,
    telegram_username: telegram.username ?? null,
  });
  if (created === "unavailable" || created === "failed") {
    throw new HttpError(502, "AUTH_PROVIDER_ERROR", "Auth provider error");
  }
  const tokenHash = await magicLinkTokenHash(email);
  if (!tokenHash) {
    throw new HttpError(502, "AUTH_PROVIDER_ERROR", "Auth provider error");
  }
  const { error } = await auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (error) throw telegramFailed();

  const { data } = await auth.getUser();
  if (!data.user) throw telegramFailed();
  const existing = await usersRepo.findUserByAuthUid(data.user.id);
  const stored = signupMetadata.safeParse(data.user.user_metadata);
  const row =
    existing ??
    (await usersRepo.insertUserIfMissing(
      data.user.id,
      stored.success ? stored.data : metadata,
    ));
  if (row.status !== "active") {
    await auth.signOut();
    throw telegramFailed();
  }
  return row;
}

export async function logout(auth: AuthClient): Promise<void> {
  await auth.signOut();
}
