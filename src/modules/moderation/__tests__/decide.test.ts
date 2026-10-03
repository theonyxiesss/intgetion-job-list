import { describe, expect, it } from "vitest";
import { isOverdue, planDecision } from "../service/decide";

const internal = (status: string) =>
  ({ kind: "job", source: "internal", status }) as const;
const imported = (status: string) =>
  ({ kind: "job", source: "imported", status }) as const;

describe("planDecision", () => {
  it("approves or rejects internal jobs waiting for moderation", () => {
    expect(planDecision(internal("pending_moderation"), "approved")).toBe(
      "approve_job",
    );
    expect(planDecision(internal("pending_moderation"), "rejected")).toBe(
      "reject_job",
    );
  });

  it("takes a live internal job down on rejection and leaves it on approval", () => {
    expect(planDecision(internal("published"), "rejected")).toBe("remove_job");
    expect(planDecision(internal("paused"), "rejected")).toBe("remove_job");
    expect(planDecision(internal("published"), "approved")).toBe("none");
    expect(planDecision(internal("removed"), "rejected")).toBe("none");
  });

  it("republishes an imported scam false positive and keeps true positives removed", () => {
    expect(planDecision(imported("removed"), "approved")).toBe(
      "republish_imported",
    );
    expect(planDecision(imported("removed"), "rejected")).toBe("none");
    expect(planDecision(imported("published"), "rejected")).toBe("remove_job");
    expect(planDecision(imported("published"), "approved")).toBe("none");
  });

  it("rejects companies only once and never touches suspended ones", () => {
    const company = (status: string) => ({ kind: "company", status }) as const;
    expect(planDecision(company("unverified"), "rejected")).toBe(
      "reject_company",
    );
    expect(planDecision(company("unverified"), "approved")).toBe("none");
    expect(planDecision(company("rejected"), "rejected")).toBe("none");
    expect(planDecision(company("suspended"), "rejected")).toBe("none");
  });

  it("verifies a company waiting for verification review only", () => {
    const review = {
      kind: "company",
      status: "pending_verification",
      reason: "verification_review",
    } as const;
    expect(planDecision(review, "approved")).toBe("verify_company");
    expect(planDecision(review, "rejected")).toBe("reject_company");
    expect(
      planDecision({ ...review, reason: "possible_duplicate" }, "approved"),
    ).toBe("none");
    expect(planDecision({ ...review, status: "verified" }, "approved")).toBe(
      "none",
    );
  });

  it("does nothing for an entity that no longer exists", () => {
    expect(planDecision({ kind: "missing" }, "rejected")).toBe("none");
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  it("marks items older than 24 hours", () => {
    expect(isOverdue(new Date("2026-10-02T12:00:00Z"), now)).toBe(false);
    expect(isOverdue(new Date("2026-10-02T11:59:59Z"), now)).toBe(true);
  });
});
