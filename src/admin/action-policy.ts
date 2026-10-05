/**
 * Order for every admin mutation: right, then step-up, then reason.
 * The main-site console (flag off) skips step-up so the existing
 * platform-admin path keeps working (D251).
 */

export type ActionDecision =
  | { ok: true }
  | { ok: false; status: 404; code: "NOT_FOUND" }
  | { ok: false; status: 401; code: "STEP_UP" }
  | { ok: false; status: 422; code: "REASON_REQUIRED" };

export function evaluateAdminAction(input: {
  allowed: boolean;
  dangerous: boolean;
  legacy: boolean;
  stepUpFresh: boolean;
  reasonRequired: boolean;
  reason?: string | null;
}): ActionDecision {
  if (!input.allowed) return { ok: false, status: 404, code: "NOT_FOUND" };
  if (input.dangerous && !input.legacy && !input.stepUpFresh) {
    return { ok: false, status: 401, code: "STEP_UP" };
  }
  if (input.reasonRequired && !input.reason?.trim()) {
    return { ok: false, status: 422, code: "REASON_REQUIRED" };
  }
  return { ok: true };
}
