import { HttpError, validationError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { signToken, verifyToken } from "@/lib/signed-token";
import {
  getAuthUserLoginEmail,
  isPlaceholderEmail,
  setAuthUserEmail,
} from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import type { AppLocale } from "@/i18n/routing";
import * as usersRepo from "../repo/users";
import type { CurrentUser } from "./auth-service";
import { renderAuthEmail } from "./auth-emails";
import { localePrefix } from "@/i18n/paths";

const PURPOSE = "email-add";
const TTL_MS = 24 * 60 * 60 * 1000;

type Claims = { userId: string; email: string };

/** Sends the confirmation mail; the 9A sender or a test double. */
export type ConfirmationMailer = (message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) => Promise<"sent" | "skipped">;

function secret(): string {
  return process.env.PRIVACY_HASH_SECRET ?? "";
}

/** Whether this account signs in only through Telegram (D231). */
export async function hasPlaceholderEmail(user: CurrentUser): Promise<boolean> {
  const email = await getAuthUserLoginEmail(user.authUid);
  return !email || isPlaceholderEmail(email);
}

/**
 * A Telegram-only account asks to add a real email (D231): a link valid for
 * 24 hours goes to that address; nothing changes until it is opened.
 */
export async function requestEmailAdd(
  user: CurrentUser,
  input: { email: string; locale: AppLocale },
  mailer: ConfirmationMailer,
  now = new Date(),
): Promise<void> {
  if (isPlaceholderEmail(input.email)) {
    throw validationError([{ path: ["email"], message: "invalid_email" }]);
  }
  if (!(await hasPlaceholderEmail(user))) {
    throw new HttpError(409, "EMAIL_ALREADY_SET", "The account has an email");
  }
  const token = signToken<Claims>(
    PURPOSE,
    { userId: user.id, email: input.email },
    new Date(now.getTime() + TTL_MS),
    secret(),
  );
  const link = `${siteUrl()}${localePrefix(input.locale)}/settings/email/confirm?token=${encodeURIComponent(token)}`;
  const letter = renderAuthEmail({
    kind: "email_add",
    locale: input.locale,
    actionHref: link,
  });
  const outcome = await mailer({
    to: input.email,
    subject: letter.subject,
    text: letter.text,
    html: letter.html,
  });
  if (outcome === "skipped") {
    throw new HttpError(503, "EMAIL_UNAVAILABLE", "Email is not configured");
  }
}

export type EmailAddResult =
  { ok: true } | { ok: false; reason: "invalid_link" | "taken" | "failed" };

/** The link from the mail: the address becomes the login email (D231). */
export async function confirmEmailAdd(
  token: string,
  now = new Date(),
): Promise<EmailAddResult> {
  const claims = verifyToken<Claims>(PURPOSE, token, secret(), now);
  if (!claims) return { ok: false, reason: "invalid_link" };
  const user = await usersRepo.findUserById(claims.userId);
  if (!user || user.status !== "active") {
    return { ok: false, reason: "invalid_link" };
  }
  const current = await getAuthUserLoginEmail(user.authUid);
  if (current?.toLowerCase() === claims.email.toLowerCase()) {
    return { ok: true };
  }
  const result = await setAuthUserEmail(user.authUid, claims.email);
  if (result === "updated") return { ok: true };
  if (result === "taken") return { ok: false, reason: "taken" };
  logger.warn({ result }, "email add failed");
  return { ok: false, reason: "failed" };
}
