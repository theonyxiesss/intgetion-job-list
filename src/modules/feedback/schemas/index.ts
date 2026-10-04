/** Request input schemas for the 4B endpoints (section 7). */
import { z } from "zod";
import { HIDE_REASONS, REPORT_REASONS } from "../rules";

export const hideJobInput = z
  .object({
    scope: z.enum(["job", "company"]),
    reason: z.enum(HIDE_REASONS).optional(),
  })
  .strict();

export type HideJobInput = z.infer<typeof hideJobInput>;

/** POST /api/matches/:jobId/feedback (6B, section 7). */
export const matchFeedbackInput = z
  .object({
    action: z.literal("dismissed"),
    reason: z.enum(HIDE_REASONS).optional(),
  })
  .strict();

export type MatchFeedbackInput = z.infer<typeof matchFeedbackInput>;

export const reportJobInput = z
  .object({
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(1000).optional(),
  })
  .strict();

export type ReportJobInput = z.infer<typeof reportJobInput>;
