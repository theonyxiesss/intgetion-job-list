import { describe, expect, it } from "vitest";
import {
  isOwnApproval,
  maskEmail,
  maskHandle,
  maskPhone,
} from "./people-service";

describe("people card masks", () => {
  it("hides the local part and keeps the domain", () => {
    expect(maskEmail("ada@example.com")).toBe("a***@example.com");
    expect(maskEmail("not-an-email")).toBe("***");
  });

  it("shows only the last four phone digits", () => {
    expect(maskPhone("+4915123456789")).toBe("+* *** ***-67-89");
  });

  it("keeps one character of a telegram handle", () => {
    expect(maskHandle("ada_l")).toBe("a***");
  });

  it("treats the requester as unable to approve their own request", () => {
    expect(isOwnApproval("admin-a", "admin-a")).toBe(true);
    expect(isOwnApproval("admin-a", "admin-b")).toBe(false);
  });
});
