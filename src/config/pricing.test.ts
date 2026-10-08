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
  it("opens payment for Hire, Team, Plus and Pro when crypto is on", () => {
    expect(planPayHref(true, "hire")).toBe("/billing/crypto?plan=hire");
    expect(planPayHref(true, "team")).toBe("/billing/crypto?plan=team");
    expect(planPayHref(true, "plus")).toBe("/billing/crypto?plan=plus");
    expect(planPayHref(true, "pro")).toBe("/billing/crypto?plan=pro");
    expect(planPayHref(true, "start")).toBeNull();
    expect(planPayHref(false, "team")).toBeNull();
  });
});
