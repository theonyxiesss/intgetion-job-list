import { z } from "zod";
import { isValidTimeZone } from "@/lib/tz";

export const SHARED_LANGUAGE_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "native",
] as const;

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

/** The account page form (D504). Empty text clears a field. */
export const sharedProfileInput = z
  .object({
    displayName: optional(120),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^([A-Z]{2})?$/)
      .nullable()
      .transform((value) => (value ? value : null)),
    city: optional(120),
    timezone: z
      .string()
      .trim()
      .nullable()
      .refine((value) => !value || isValidTimeZone(value), "invalid_timezone")
      .transform((value) => (value ? value : null)),
    languages: z
      .array(
        z
          .object({
            code: z
              .string()
              .trim()
              .toLowerCase()
              .regex(/^[a-z]{2}$/),
            level: z.enum(SHARED_LANGUAGE_LEVELS).nullable(),
          })
          .strict(),
      )
      .max(20),
    about: optional(1000),
  })
  .strict();

export type SharedProfileInput = z.infer<typeof sharedProfileInput>;
