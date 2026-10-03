/**
 * Pure feedback rules (4B): valid actions and reasons for user_job_feedback
 * (4.1), report input validation and the listing filter for hidden content.
 * No database access here.
 */
export const FEEDBACK_ACTIONS = [
  "viewed",
  "saved",
  "unsaved",
  "applied",
  "applied_external",
  "dismissed",
  "hidden",
  "hidden_company",
] as const;

export type FeedbackAction = (typeof FEEDBACK_ACTIONS)[number];

export const HIDE_REASONS = [
  "salary",
  "format",
  "timezone",
  "company",
  "role",
  "other",
] as const;

export type HideReason = (typeof HIDE_REASONS)[number];

/** Actions that carry a reason (4.1: reason для hidden/dismissed). */
export const REASON_ACTIONS: readonly FeedbackAction[] = [
  "hidden",
  "dismissed",
];

export function isFeedbackAction(value: string): value is FeedbackAction {
  return (FEEDBACK_ACTIONS as readonly string[]).includes(value);
}

export function isHideReason(value: string): value is HideReason {
  return (HIDE_REASONS as readonly string[]).includes(value);
}

export type FeedbackEvent = {
  action: FeedbackAction;
  reason: string | null;
};

export class InvalidFeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFeedbackError";
  }
}

/**
 * Validates one feedback event: hidden/dismissed may carry a reason from the
 * fixed list (optional per section 7 — a user may hide without stating why),
 * all other actions must not carry one (D110).
 */
export function validateFeedbackEvent(
  action: string,
  reason: string | null | undefined,
): FeedbackEvent {
  if (!isFeedbackAction(action)) {
    throw new InvalidFeedbackError(`unknown feedback action: ${action}`);
  }
  if (REASON_ACTIONS.includes(action)) {
    if (reason === null || reason === undefined) {
      return { action, reason: null };
    }
    if (!isHideReason(reason)) {
      throw new InvalidFeedbackError(
        `action ${action} accepts a reason: ${HIDE_REASONS.join("|")}`,
      );
    }
    return { action, reason };
  }
  if (reason != null) {
    throw new InvalidFeedbackError(`action ${action} must not carry a reason`);
  }
  return { action, reason: null };
}

export const REPORT_REASONS = [
  "scam",
  "spam",
  "fake_company",
  "discrimination",
  "wrong_info",
  "inappropriate",
  "other",
] as const;

export type ReportReasonValue = (typeof REPORT_REASONS)[number];

export const REPORT_ENTITY_TYPES = ["job", "company", "user"] as const;
export type ReportEntityType = (typeof REPORT_ENTITY_TYPES)[number];

export const REPORT_DETAILS_MAX_LENGTH = 1000;

export function isReportReason(value: string): value is ReportReasonValue {
  return (REPORT_REASONS as readonly string[]).includes(value);
}

export function isReportEntityType(value: string): value is ReportEntityType {
  return (REPORT_ENTITY_TYPES as readonly string[]).includes(value);
}

/**
 * One report per (reporter, entity) is enforced by a unique index; the
 * caller maps the 23505 violation to 409 ALREADY_REPORTED (D111).
 */
export const REPORT_UNIQUE_VIOLATION_CODE = "23505";

export interface HiddenSets {
  hiddenJobIds: ReadonlySet<string>;
  hiddenCompanyIds: ReadonlySet<string>;
}

export interface HideableRow {
  job: { id: string };
  company: { id: string };
}

/** A second applied_external for the same user and job writes nothing (D72). */
export function shouldRecordExternalApply(alreadyRecorded: boolean): boolean {
  return !alreadyRecorded;
}

/** Filters jobs the viewer hid and jobs of companies the viewer hid (7). */
export function withoutHidden<T extends HideableRow>(
  rows: readonly T[],
  hidden: HiddenSets | null,
): T[] {
  if (!hidden) return [...rows];
  return rows.filter(
    (row) =>
      !hidden.hiddenJobIds.has(row.job.id) &&
      !hidden.hiddenCompanyIds.has(row.company.id),
  );
}
