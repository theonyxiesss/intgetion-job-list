import { describe, expect, it } from "vitest";
import { pricingAudienceFor } from "./viewer";

describe("pricing audience by viewer (D334)", () => {
  it("shows a signed-in user only their own plans, whatever the link says", () => {
    expect(pricingAudienceFor("employer", undefined)).toBe("companies");
    expect(pricingAudienceFor("employer", "candidates")).toBe("companies");
    expect(pricingAudienceFor("candidate", "companies")).toBe("candidates");
  });

  it("lets a guest switch, candidates by default", () => {
    expect(pricingAudienceFor("guest", undefined)).toBe("candidates");
    expect(pricingAudienceFor("guest", "companies")).toBe("companies");
    expect(pricingAudienceFor("guest", "nonsense")).toBe("candidates");
  });

  it("opens company plans when the person came to post a job", () => {
    expect(pricingAudienceFor("candidate", undefined, "post")).toBe("companies");
    expect(pricingAudienceFor("guest", "candidates", "post")).toBe("companies");
  });
});
