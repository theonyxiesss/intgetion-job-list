import { describe, expect, it } from "vitest";
import { freePlanHref } from "./pricing";

describe("free plan link", () => {
  it("sends a poster to the job form", () => {
    expect(freePlanHref("companies", "post")).toBe("/employer/jobs/new");
  });

  it("keeps the ordinary free links", () => {
    expect(freePlanHref("companies")).toBe("/for-employers");
    expect(freePlanHref("candidates", "post")).toBe("/register");
  });
});
