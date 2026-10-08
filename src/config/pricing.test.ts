import { describe, expect, it } from "vitest";
import { freePlanHref, planPayHref } from "./pricing";

describe("free plan link", () => {
  it("sends a poster to the job form", () => {
    expect(freePlanHref("companies", "post")).toBe("/employer/jobs/new");
  });

  it("keeps the ordinary free links", () => {
    expect(freePlanHref("companies")).toBe("/for-employers");
    expect(freePlanHref("candidates", "post")).toBe("/register");
  });
});

describe("paid plan links", () => {
  it("opens payment only for a signed-in user", () => {
    expect(planPayHref(true, "hire", true)).toBe("/billing/crypto?plan=hire");
    expect(planPayHref(true, "team", true)).toBe("/billing/crypto?plan=team");
    expect(planPayHref(true, "plus", true)).toBe("/billing/crypto?plan=plus");
    expect(planPayHref(true, "pro", true)).toBe("/billing/crypto?plan=pro");
    expect(planPayHref(true, "start", true)).toBeNull();
    expect(planPayHref(false, "team", true)).toBeNull();
  });

  it("sends a guest who clicks pay to the login page", () => {
    expect(planPayHref(true, "hire", false)).toBe("/login?next=billing");
    expect(planPayHref(true, "team", false)).toBe("/login?next=billing-team");
    expect(planPayHref(true, "plus", false)).toBe("/login?next=billing-plus");
    expect(planPayHref(true, "pro", false)).toBe("/login?next=billing-pro");
  });
});
