import { z } from "zod";
import { routing } from "@/i18n/routing";
import { COMMON_PASSWORDS } from "./common-passwords";

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 72;

export const localeSchema = z.enum(routing.locales);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z.email({ error: "invalid_email" }).max(254, { error: "invalid_email" }),
  );

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: "password_too_short" })
  .max(PASSWORD_MAX_LENGTH, { error: "password_too_long" })
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    error: "password_too_common",
  });

/** `POST /api/auth/register`. Without a password the user gets a magic link. */
export const registerInput = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
  locale: localeSchema,
  acceptTerms: z.literal(true, { error: "terms_required" }),
});
export type RegisterInput = z.infer<typeof registerInput>;

/** `POST /api/auth/reset`. */
export const resetInput = z.object({
  email: emailSchema,
  locale: localeSchema,
});
export type ResetInput = z.infer<typeof resetInput>;

/** `POST /api/auth/password`: new password after a recovery link (D37). */
export const newPasswordInput = z.object({ password: passwordSchema });
export type NewPasswordInput = z.infer<typeof newPasswordInput>;

/** `PATCH /api/me`. */
export const updateMeInput = z
  .object({
    locale: localeSchema.optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "empty_patch" });
export type UpdateMeInput = z.infer<typeof updateMeInput>;

/**
 * What registration stores in Supabase user metadata until the email is
 * confirmed; the callback turns it into the `users` row.
 */
export const signupMetadata = z.object({
  terms_version: z.string().min(1),
  terms_accepted_at: z.iso.datetime(),
  locale: localeSchema,
});
export type SignupMetadata = z.infer<typeof signupMetadata>;
