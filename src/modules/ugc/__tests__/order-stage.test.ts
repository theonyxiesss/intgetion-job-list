import { describe, expect, it } from "vitest";
import { UGC_SUBMISSION_STATUSES } from "@/config/ugc";
import {
  participationStage,
  workspaceOrderStage,
} from "../service/order-stage";

describe("UGC participationStage (D605)", () => {
  it("keeps a response or an offer before the line", () => {
    for (const status of ["applied", "offered"] as const) {
      expect(participationStage({ status, submission: null })).toEqual({
        step: null,
        tone: "waiting",
      });
    }
  });

  it("follows the video once the creator is hired", () => {
    const hired = (
      submission: (typeof UGC_SUBMISSION_STATUSES)[number] | null,
    ) =>
      participationStage({
        status: "hired",
        submission: submission ? { status: submission } : null,
      });
    expect(hired(null)).toEqual({ step: 1, tone: "work" });
    expect(hired("changes_requested")).toEqual({ step: 1, tone: "work" });
    expect(hired("submitted")).toEqual({ step: 2, tone: "review" });
    expect(hired("accepted")).toEqual({ step: 3, tone: "done" });
    expect(hired("winner")).toEqual({ step: 3, tone: "done" });
    expect(hired("rejected")).toEqual({ step: null, tone: "closed" });
  });

  it("takes declined, expired and withdrawn work off the line", () => {
    for (const status of ["declined", "expired", "withdrawn"] as const) {
      expect(participationStage({ status, submission: null })).toEqual({
        step: null,
        tone: "closed",
      });
    }
  });
});

describe("UGC workspaceOrderStage (D605)", () => {
  it("maps the creator's stages onto the same steps", () => {
    expect(workspaceOrderStage("offer").step).toBeNull();
    expect(workspaceOrderStage("applied").step).toBeNull();
    expect(workspaceOrderStage("submit")).toEqual({ step: 1, tone: "work" });
    expect(workspaceOrderStage("changes")).toEqual({ step: 1, tone: "work" });
    expect(workspaceOrderStage("overdue")).toEqual({ step: 1, tone: "work" });
    expect(workspaceOrderStage("review")).toEqual({ step: 2, tone: "review" });
    expect(workspaceOrderStage("payout_wait")).toEqual({
      step: 3,
      tone: "done",
    });
    expect(workspaceOrderStage("paid")).toEqual({ step: 3, tone: "done" });
    expect(workspaceOrderStage("rejected").tone).toBe("closed");
    expect(workspaceOrderStage("closed").tone).toBe("closed");
  });
});
