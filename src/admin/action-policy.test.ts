import { describe, expect, it } from "vitest";
import { evaluateAdminAction } from "./action-policy";

const base = {
  allowed: true,
  dangerous: true,
  legacy: false,
  stepUpFresh: true,
  reasonRequired: true,
  reason: "complaint",
};

describe("admin action wrapper", () => {
  it("answers 404 when the role lacks the right", () => {
    expect(evaluateAdminAction({ ...base, allowed: false })).toEqual({
      ok: false,
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("answers 422 when a reason is required and missing", () => {
    expect(evaluateAdminAction({ ...base, reason: "  " })).toEqual({
      ok: false,
      status: 422,
      code: "REASON_REQUIRED",
    });
  });

  it("answers 401 STEP_UP when the second factor is stale", () => {
    expect(evaluateAdminAction({ ...base, stepUpFresh: false })).toEqual({
      ok: false,
      status: 401,
      code: "STEP_UP",
    });
  });

  it("lets a fresh, permitted action through", () => {
    expect(evaluateAdminAction(base)).toEqual({ ok: true });
  });

  it("does not demand step-up on the legacy main-host console", () => {
    expect(
      evaluateAdminAction({ ...base, legacy: true, stepUpFresh: false }),
    ).toEqual({ ok: true });
  });
});
