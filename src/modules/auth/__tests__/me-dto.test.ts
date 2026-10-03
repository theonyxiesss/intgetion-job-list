import { describe, expect, it } from "vitest";
import { toMeDto } from "../api/me-dto";
import type { CurrentUser } from "../service/auth-service";

const row: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  authUid: "22222222-2222-4222-8222-222222222222",
  platformRole: "user",
  status: "active",
  locale: "ru",
  termsAcceptedAt: new Date("2026-10-03T00:00:00Z"),
  termsVersion: "2026-10-03",
  marketingOptIn: true,
  lastActiveAt: null,
  createdAt: new Date("2026-10-03T00:00:00Z"),
  updatedAt: new Date("2026-10-03T00:00:00Z"),
  deletedAt: null,
};

describe("toMeDto", () => {
  it("exposes only the allowlisted keys", () => {
    const dto = toMeDto(row);
    expect(Object.keys(dto).sort()).toEqual([
      "companies",
      "hasCandidateProfile",
      "id",
      "locale",
      "marketingOptIn",
    ]);
    expect(JSON.stringify(dto)).not.toContain(row.authUid);
  });

  it("adds platformRole only for admins", () => {
    expect(toMeDto({ ...row, platformRole: "admin" }).platformRole).toBe(
      "admin",
    );
    expect("platformRole" in toMeDto(row)).toBe(false);
  });

  it("lists companies with id, name and role only", () => {
    const company = {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Acme",
      role: "owner",
      domain: "acme.example.com",
      status: "unverified",
    };
    const dto = toMeDto(row, {
      companies: [company],
      hasCandidateProfile: true,
    });
    expect(dto.companies).toEqual([
      { id: company.id, name: "Acme", role: "owner" },
    ]);
    expect(dto.hasCandidateProfile).toBe(true);
  });
});
