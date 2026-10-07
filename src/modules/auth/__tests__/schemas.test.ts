import { describe, expect, it } from "vitest";
import {
  emailSchema,
  newPasswordInput,
  passwordSchema,
  registerInput,
  updateMeInput,
} from "../schemas";

function firstMessage(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  return result.error?.issues[0]?.message;
}

describe("passwordSchema", () => {
  it("rejects passwords shorter than 10 characters", () => {
    expect(firstMessage(passwordSchema.safeParse("short-pw1"))).toBe(
      "password_too_short",
    );
  });

  it("rejects common passwords regardless of case", () => {
    expect(firstMessage(passwordSchema.safeParse("Basketball"))).toBe(
      "password_too_common",
    );
  });

  it("rejects passwords longer than 72 bytes worth of characters", () => {
    expect(firstMessage(passwordSchema.safeParse("x".repeat(73)))).toBe(
      "password_too_long",
    );
  });

  it("accepts a long uncommon password", () => {
    expect(passwordSchema.safeParse("orbit-lantern-42").success).toBe(true);
  });
});

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Ana@Example.COM ")).toBe("ana@example.com");
  });

  it("reports invalid addresses with a stable code", () => {
    expect(firstMessage(emailSchema.safeParse("not-an-email"))).toBe(
      "invalid_email",
    );
  });
});

describe("registerInput", () => {
  const base = {
    email: "ana@example.com",
    locale: "en",
    accountType: "candidate",
  };

  it("requires choosing candidate or employer (D331)", () => {
    const withoutType = { email: base.email, locale: base.locale };
    expect(
      firstMessage(
        registerInput.safeParse({ ...withoutType, acceptTerms: true }),
      ),
    ).toBe("account_type_required");
    expect(
      registerInput.safeParse({
        ...base,
        accountType: "admin",
        acceptTerms: true,
      }).success,
    ).toBe(false);
  });

  it("requires the terms to be accepted", () => {
    expect(
      firstMessage(registerInput.safeParse({ ...base, acceptTerms: false })),
    ).toBe("terms_required");
    expect(registerInput.safeParse(base).success).toBe(false);
  });

  it("allows registration without a password (magic link)", () => {
    expect(
      registerInput.safeParse({ ...base, acceptTerms: true }).success,
    ).toBe(true);
  });

  it("checks the password when one is given", () => {
    expect(
      registerInput.safeParse({
        ...base,
        acceptTerms: true,
        password: "1234567890",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown locales", () => {
    expect(
      registerInput.safeParse({ ...base, acceptTerms: true, locale: "de" })
        .success,
    ).toBe(false);
  });
});

describe("newPasswordInput", () => {
  it("applies the same password rules", () => {
    expect(newPasswordInput.safeParse({ password: "qwertyuiop" }).success).toBe(
      false,
    );
  });
});

describe("updateMeInput", () => {
  it("accepts locale and marketing opt-in", () => {
    expect(
      updateMeInput.safeParse({ locale: "ru", marketingOptIn: true }).success,
    ).toBe(true);
  });

  it("rejects unknown keys and empty patches", () => {
    expect(updateMeInput.safeParse({ platformRole: "admin" }).success).toBe(
      false,
    );
    expect(updateMeInput.safeParse({}).success).toBe(false);
  });
});
