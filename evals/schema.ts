import { z } from "zod";

/**
 * Formats of the eval data (19.3). The runner (`pnpm eval`) comes in 7B;
 * these schemas and the data are checked by unit tests now.
 */

const slug = z.string().regex(/^[a-z0-9]+$/);

/** D19: integer minor units, ISO 4217, period and basis apart. */
const salary = z
  .object({
    minMinor: z.number().int().positive().optional(),
    maxMinor: z.number().int().positive().optional(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    period: z.enum(["hour", "month", "year"]),
    basis: z.enum(["gross", "net"]),
  })
  .strict()
  .refine((s) => s.minMinor !== undefined || s.maxMinor !== undefined, {
    message: "salary needs min or max",
  })
  .refine(
    (s) =>
      s.minMinor === undefined ||
      s.maxMinor === undefined ||
      s.minMinor <= s.maxMinor,
    { message: "salary min above max" },
  );

export const expectedProfile = z
  .object({
    skills: z.array(slug).min(1),
    desiredTitles: z.array(z.string().min(2)).optional(),
    experienceYears: z.number().int().min(0).max(60).optional(),
    timezone: z.string().min(3),
    workFormats: z.array(z.enum(["remote", "hybrid", "onsite"])).min(1),
    employmentTypes: z
      .array(z.enum(["full_time", "part_time", "contract"]))
      .optional(),
    languages: z
      .array(
        z
          .object({
            lang: z.string().regex(/^[a-z]{2}$/),
            level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "native"]),
          })
          .strict(),
      )
      .optional(),
    salary: salary.optional(),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    city: z.string().min(2).optional(),
  })
  .strict();

export const goldenDialog = z
  .object({
    id: z.string().regex(/^onboarding-(en|ru)-\d{2}$/),
    locale: z.enum(["en", "ru"]),
    /** What the browser reported; the bot only proposes it (12.2). */
    browserTimezone: z.string().optional(),
    turns: z.array(z.object({ user: z.string().min(1) }).strict()).min(1),
    expected: expectedProfile,
    /** PII that appears in the turns and must be redacted before the LLM. */
    piiInTurns: z.array(z.enum(["email", "phone", "link"])).default([]),
  })
  .strict();

export const ATTACK_TYPES = [
  "instruction_in_job",
  "foreign_contacts",
  "fake_admin",
  "apply_without_confirmation",
  "system_prompt_leak",
  "pii_in_user_text",
] as const;

export const adversarialCase = z
  .object({
    id: z.string().regex(/^adversarial-\d{2}$/),
    locale: z.enum(["en", "ru"]),
    attack: z.enum(ATTACK_TYPES),
    /** Untrusted content the attack hides in, if any (job description etc.). */
    untrusted: z
      .object({
        source: z.string().regex(/^(?:job|company):[A-Za-z0-9-]+$/),
        text: z.string().min(1),
      })
      .strict()
      .optional(),
    turns: z.array(z.object({ user: z.string().min(1) }).strict()).min(1),
    expected: z
      .object({
        must: z.array(z.string().min(5)).min(1),
        mustNot: z.array(z.string().min(5)).min(1),
        /** Tools that must not be called in this case. */
        forbiddenTools: z.array(z.string()).default([]),
      })
      .strict(),
  })
  .strict();

export type GoldenDialog = z.infer<typeof goldenDialog>;
export type AdversarialCase = z.infer<typeof adversarialCase>;
