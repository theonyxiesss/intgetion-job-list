import type {
  EmailOtpType,
  SupabaseClient,
  User,
  UserIdentity,
} from "@supabase/supabase-js";
import { TERMS_VERSION } from "@/config/legal";
import type { AppLocale } from "@/i18n/routing";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  createConfirmedAuthUser,
  findAuthUserByEmail,
  getAuthUserLoginEmail,
  isPlaceholderEmail,
  magicLinkTokenHash,
} from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import {
  HttpError,
  errorCodes,
  unauthenticated,
  validationError,
} from "@/lib/http";
import * as telegramAccounts from "../repo/telegram-accounts";
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
import { localePrefix } from "@/i18n/paths";
import type { LoginNext } from "@/components/auth/login-next";

export type AuthClient = Pick<
  SupabaseClient["auth"],
  | "signUp"
  | "signInWithOtp"
  | "resend"
  | "resetPasswordForEmail"
  | "exchangeCodeForSession"
  | "verifyOtp"
  | "getUser"
  | "signOut"
  | "updateUser"
  | "signInWithPassword"
  | "signInWithOAuth"
  | "linkIdentity"
  | "getUserIdentities"
  | "unlinkIdentity"
>;

export type CurrentUser = usersRepo.UserRow;

/** Outcome of `register` for the API / check-email screen (D327). */
export type RegisterResult = { status: "created" | "resent" };

export function callbackUrl(
  locale: AppLocale,
  next?: "reset" | "account" | LoginNext,
  wait?: string,
): string {
  const url = new URL(`${siteUrl()}${localePrefix(locale)}/auth/callback`);
  if (next) url.searchParams.set("next", next);
  if (wait) url.searchParams.set("wait", wait);
  return url.toString();
}

/** Short-lived proof that this browser accepted the terms by pressing Google or X (D335, D336). */
export const GOOGLE_TERMS_COOKIE = "google_terms";

export function googleSignupMetadata(
  locale: AppLocale,
  now: Date = new Date(),
): SignupMetadata {
  return {
    terms_version: TERMS_VERSION,
    terms_accepted_at: now.toISOString(),
    locale,
    account_type: "candidate",
  };
}

export type OAuthProviderName = "google" | "x";

/** A linked Google or X identity, with a short label when the provider sent one. */
export type LinkedOAuth = { label: string | null };

/** Sends the browser to Google. The secret stays in the Supabase project (D335). */
export async function startGoogleSignIn(
  auth: AuthClient,
  input: { locale: AppLocale; next?: LoginNext; link?: boolean },
): Promise<{ url: string }> {
  return startOAuthSignIn(auth, { ...input, provider: "google" });
}

/** Sends the browser to X. The secret stays in the Supabase project (D336). */
export async function startXSignIn(
  auth: AuthClient,
  input: { locale: AppLocale; next?: LoginNext; link?: boolean },
): Promise<{ url: string }> {
  return startOAuthSignIn(auth, { ...input, provider: "x" });
}

async function startOAuthSignIn(
  auth: AuthClient,
  input: {
    provider: OAuthProviderName;
    locale: AppLocale;
    next?: LoginNext;
    link?: boolean;
  },
): Promise<{ url: string }> {
  const options = {
    redirectTo: callbackUrl(input.locale, input.link ? "account" : input.next),
    skipBrowserRedirect: true as const,
    ...(input.provider === "google"
      ? { queryParams: { prompt: "select_account" } }
      : {}),
  };
  const { data, error } = input.link
    ? await auth.linkIdentity({ provider: input.provider, options })
    : await auth.signInWithOAuth({ provider: input.provider, options });
  if (error || !data.url) throw authFailure(error ?? {});
  return { url: data.url };
}

function isOAuthProvider(provider: string, wanted: OAuthProviderName): boolean {
  if (wanted === "x") return provider === "x" || provider === "twitter";
  return provider === "google";
}

function textOf(
  data: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = data?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function oauthLabel(
  identity: UserIdentity,
  provider: OAuthProviderName,
): string | null {
  const data = identity.identity_data;
  if (provider === "x") {
    const username =
      textOf(data, "preferred_username") ??
      textOf(data, "user_name") ??
      textOf(data, "username");
    if (!username) return textOf(data, "email");
    return username.startsWith("@") ? username : `@${username}`;
  }
  return textOf(data, "email");
}

/** Google and X already attached to the signed-in Supabase user (D339). */
export async function linkedOAuthAccounts(auth: AuthClient): Promise<{
  google: LinkedOAuth | null;
  x: LinkedOAuth | null;
}> {
  const { data, error } = await auth.getUserIdentities();
  if (error || !data) return { google: null, x: null };
  const one = (provider: OAuthProviderName): LinkedOAuth | null => {
    const identity = data.identities.find((item) =>
      isOAuthProvider(item.provider, provider),
    );
    return identity ? { label: oauthLabel(identity, provider) } : null;
  };
  return { google: one("google"), x: one("x") };
}

function lastSignIn(): HttpError {
  return new HttpError(409, "LAST_SIGN_IN", "Last sign-in method", {
    reason: "last_sign_in",
  });
}

/**
 * Detaches Google or X. Refuses when it is the only Supabase identity,
 * so the account cannot be left with no way back in (D339).
 */
export async function unlinkOAuthProvider(
  auth: AuthClient,
  provider: OAuthProviderName,
): Promise<void> {
  const { data, error } = await auth.getUserIdentities();
  if (error || !data) throw authProviderError();
  const identity = data.identities.find((item) =>
    isOAuthProvider(item.provider, provider),
  );
  if (!identity) return;
  if (data.identities.length < 2) throw lastSignIn();
  const { error: unlinkError } = await auth.unlinkIdentity(identity);
  if (!unlinkError) return;
  const code = unlinkError.code ?? "";
  if (
    unlinkError.status === 422 ||
    code === "single_identity_not_deletable" ||
    code === "conflict"
  ) {
    throw lastSignIn();
  }
  throw authProviderError();
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

function emailAlreadyRegistered(): HttpError {
  return new HttpError(
    409,
    "EMAIL_ALREADY_REGISTERED",
    "Email already registered",
    { reason: "email_already_registered" },
  );
}

/**
 * Existing password signup: confirmed → tell them to sign in; still waiting
 * for confirmation → send the letter again (D327).
 */
async function finishExistingPasswordRegister(
  auth: AuthClient,
  input: RegisterInput & { wait?: string },
): Promise<RegisterResult> {
  const existing = await findAuthUserByEmail(input.email);
  if (existing?.confirmed) throw emailAlreadyRegistered();

  const { error } = await auth.resend({
    type: "signup",
    email: input.email,
    options: {
      emailRedirectTo: callbackUrl(input.locale, undefined, input.wait),
    },
  });
  // Resend worked → unfinished signup. Any failure → treat as already
  // registered (D327): never show a generic "something went wrong".
  if (!error) return { status: "resent" };
  throw emailAlreadyRegistered();
}

/**
 * Starts registration. The `users` row is created by the callback, after the
 * email is confirmed; until then terms and locale live in user metadata.
 * An already-confirmed address is a clear 409 (D327); an unfinished signup
 * gets another confirmation letter.
 */
export async function register(
  auth: AuthClient,
  input: RegisterInput & { wait?: string },
  now: Date = new Date(),
): Promise<RegisterResult> {
  const data: SignupMetadata = {
    terms_version: TERMS_VERSION,
    terms_accepted_at: now.toISOString(),
    locale: input.locale,
    account_type: input.accountType,
  };
  const emailRedirectTo = callbackUrl(input.locale, input.next, input.wait);

  if (!input.password) {
    const { error } = await auth.signInWithOtp({
      email: input.email,
      options: { shouldCreateUser: true, emailRedirectTo, data },
    });
    if (error) throw authFailure(error);
    return { status: "created" };
  }

  const { data: signed, error } = await auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo, data },
  });
  if (error && error.code !== "user_already_exists") throw authFailure(error);

  // GoTrue hides duplicates as a user with an empty identities list.
  const duplicate =
    error?.code === "user_already_exists" ||
    (signed.user != null &&
      Array.isArray(signed.user.identities) &&
      signed.user.identities.length === 0);
  if (duplicate) return finishExistingPasswordRegister(auth, input);
  return { status: "created" };
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
  input: MagicLinkInput & { wait?: string },
): Promise<void> {
  const { error } = await auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: callbackUrl(input.locale, input.next, input.wait),
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
  /** `created`: this link finished a registration (D331 picks the landing page). */
  | { ok: true; user: CurrentUser; created: boolean }
  | { ok: false; reason: "invalid_link" | "missing_terms" | "identity_taken" };

function callbackFailureReason(error: {
  code?: string;
}): "invalid_link" | "identity_taken" {
  if (error.code === "identity_already_exists") return "identity_taken";
  return "invalid_link";
}

/**
 * `/auth/callback`: turns the email link into a session, then makes sure the
 * `users` row exists. `code` is the PKCE flow; `token_hash` is the OTP flow.
 */
export async function completeCallback(
  auth: AuthClient,
  params: CallbackParams,
  fallback?: SignupMetadata,
): Promise<CallbackResult> {
  if (params.code) {
    const { error } = await auth.exchangeCodeForSession(params.code);
    if (error) return { ok: false, reason: callbackFailureReason(error) };
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
  if (existing) return { ok: true, user: existing, created: false };

  const fromProvider = signupMetadata.safeParse(data.user.user_metadata);
  const accepted = fromProvider.success
    ? fromProvider
    : signupMetadata.safeParse(fallback);
  if (!accepted.success) {
    await auth.signOut();
    return { ok: false, reason: "missing_terms" };
  }
  const user = await usersRepo.insertUserIfMissing(data.user.id, accepted.data);
  return { ok: true, user, created: true };
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

function authProviderError(): HttpError {
  return new HttpError(502, "AUTH_PROVIDER_ERROR", "Auth provider error");
}

function verifiedTelegram(result: string, botToken: string, now: Date) {
  const telegram = verifyTelegramAuth(
    decodeTelegramResult(result),
    botToken,
    now,
  );
  if (!telegram) throw telegramFailed();
  return telegram;
}

/** Opens a session for an existing login email without sending mail. */
async function openSession(auth: AuthClient, email: string): Promise<void> {
  const tokenHash = await magicLinkTokenHash(email);
  if (!tokenHash) throw authProviderError();
  const { error } = await auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (error) throw telegramFailed();
}

/**
 * Telegram sign-in (D217, D230): checks the signed `tgAuthResult` and opens
 * a session through a one-time magic-link token. A linked Telegram id signs
 * into its account whatever the login email now is; an unknown one gets a
 * new account with a placeholder email (terms accepted by continuing), and
 * the link is recorded — also for accounts made before D230.
 */
export async function signInWithTelegram(
  auth: AuthClient,
  input: { result: string; locale: AppLocale },
  botToken: string,
  now: Date = new Date(),
): Promise<CurrentUser> {
  const telegram = verifiedTelegram(input.result, botToken, now);
  return signInWithTelegramProfile(auth, telegram, input.locale, now);
}

/**
 * Signs in a Telegram user whose identity is already proven — by the widget
 * signature (D217) or by a bot tap on a one-time code (D256).
 */
export async function signInWithTelegramProfile(
  auth: AuthClient,
  telegram: { id: number; username?: string | null },
  locale: AppLocale,
  now: Date = new Date(),
): Promise<CurrentUser> {
  const username = telegram.username ?? null;

  const linked = await telegramAccounts.findByTelegramId(telegram.id);
  if (linked) {
    const user = await usersRepo.findUserById(linked.userId);
    const email = user ? await getAuthUserLoginEmail(user.authUid) : null;
    if (!user || user.status !== "active" || !email) throw telegramFailed();
    await openSession(auth, email);
    await telegramAccounts.link(telegram.id, user.id, username);
    return user;
  }

  const email = telegramEmail(telegram.id);
  const metadata: SignupMetadata = {
    terms_version: TERMS_VERSION,
    terms_accepted_at: now.toISOString(),
    locale,
  };
  const created = await createConfirmedAuthUser(email, {
    ...metadata,
    telegram_id: telegram.id,
    telegram_username: username,
  });
  if (created === "unavailable" || created === "failed") {
    throw authProviderError();
  }
  await openSession(auth, email);

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
  await telegramAccounts.link(telegram.id, row.id, username);
  return row;
}

/**
 * Links Telegram to the signed-in account (D230). 409 when this Telegram
 * is already another account's sign-in, or this account has another one.
 */
/** The account linked to a Telegram id, if any (D311). Reads, never links. */
export async function userIdForTelegramId(
  telegramId: number,
): Promise<string | null> {
  const linked = await telegramAccounts.findByTelegramId(telegramId);
  return linked?.userId ?? null;
}

/** Attaches an already proven Telegram profile. 409 when it belongs elsewhere. */
export async function linkTelegramProfile(
  user: CurrentUser,
  telegram: { id: number; username?: string | null },
): Promise<void> {
  const linked = await telegramAccounts.link(
    telegram.id,
    user.id,
    telegram.username ?? null,
  );
  if (!linked) {
    throw new HttpError(409, "TELEGRAM_TAKEN", "Telegram already linked", {
      reason: "telegram_taken",
    });
  }
}

export async function linkTelegram(
  user: CurrentUser,
  result: string,
  botToken: string,
  now: Date = new Date(),
): Promise<void> {
  const telegram = verifiedTelegram(result, botToken, now);
  await linkTelegramProfile(user, telegram);
}

/**
 * Removes the Telegram sign-in — only when the account can still sign in
 * another way, i.e. it has a real email (D230).
 */
export async function unlinkTelegram(user: CurrentUser): Promise<void> {
  const email = await getAuthUserLoginEmail(user.authUid);
  if (!email || isPlaceholderEmail(email)) {
    throw new HttpError(409, "TELEGRAM_ONLY_SIGN_IN", "Add an email first", {
      reason: "email_required",
    });
  }
  await telegramAccounts.unlink(user.id);
}

export async function telegramLinkOf(user: CurrentUser) {
  return telegramAccounts.findByUserId(user.id);
}

/** Public user id for an auth uid, or null when that account cannot be added. */
export async function userIdForAuthUid(authUid: string): Promise<string | null> {
  const row = await usersRepo.findUserByAuthUid(authUid);
  if (!row || row.deletedAt || row.status !== "active") return null;
  return row.id;
}

export async function logout(auth: AuthClient): Promise<void> {
  await auth.signOut();
}
