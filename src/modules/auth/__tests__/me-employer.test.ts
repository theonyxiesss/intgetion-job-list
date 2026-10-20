import { describe, expect, it } from "vitest";
import { toMeDto, type CurrentUser } from "../service";

const user = {
  id: "u1",
  locale: "ru",
  marketingOptIn: false,
  platformRole: "user",
} as unknown as CurrentUser;

describe("employer by membership (D506)", () => {
  it("reports employer only for a company member", () => {
    expect(toMeDto(user).accountType).toBe("candidate");
    expect(
      toMeDto(user, {
        companies: [{ id: "c1", name: "Acme", role: "owner" }],
        hasCandidateProfile: false,
      }).accountType,
    ).toBe("employer");
  });
});
