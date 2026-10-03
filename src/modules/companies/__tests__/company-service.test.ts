import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/http";
import { assertCompanyEditable, isPossibleDuplicate } from "../service";

describe("company authorization", () => {
  const internal = { origin: "internal" as const };
  it.each(["owner", "admin"])("allows %s to edit", (role) => {
    expect(() => assertCompanyEditable(internal, role)).not.toThrow();
  });
  it.each(["recruiter", "member"])("returns 403 for visible %s", (role) => {
    expect(() => assertCompanyEditable(internal, role)).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });
  it("hides a company from non-members", () => {
    expect(() => assertCompanyEditable(internal, null)).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });
  it("makes imported companies read-only", () => {
    try {
      assertCompanyEditable({ origin: "imported" }, "owner");
      throw new Error("expected imported company rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({ status: 422, code: "IMPORTED_READONLY" });
    }
  });
});

describe("possible duplicate rules", () => {
  it("flags a matching domain", () =>
    expect(isPossibleDuplicate("Example.com", "example.com", 0)).toBe(true));
  it("flags name similarity at or above 0.8", () =>
    expect(isPossibleDuplicate(null, null, 0.8)).toBe(true));
  it("does not flag name similarity below 0.8", () =>
    expect(isPossibleDuplicate(null, null, 0.79)).toBe(false));
});
