import { describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/modules/auth/service";
import {
  requireAdmin,
  requireCandidate,
  requireMembership,
  requireUser,
} from "./auth-guards";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const user: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  authUid: "22222222-2222-4222-8222-222222222222",
  platformRole: "user",
  status: "active",
  locale: "en",
  termsAcceptedAt: new Date("2026-10-03T00:00:00Z"),
  termsVersion: "2026-10-03",
  marketingOptIn: false,
  lastActiveAt: null,
  createdAt: new Date("2026-10-03T00:00:00Z"),
  updatedAt: new Date("2026-10-03T00:00:00Z"),
  deletedAt: null,
};
const admin: CurrentUser = { ...user, platformRole: "admin" };

const as = (value: CurrentUser | null) => async () => value;
const companyId = "33333333-3333-4333-8333-333333333333";

describe("requireUser", () => {
  it("returns the signed-in user", async () => {
    await expect(requireUser(as(user))).resolves.toBe(user);
  });

  it("answers 401 without a session", async () => {
    await expect(requireUser(as(null))).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });
});

describe("requireAdmin", () => {
  it("lets a platform admin through", async () => {
    await expect(requireAdmin(as(admin))).resolves.toBe(admin);
  });

  it("answers 404 to a regular user and to a guest", async () => {
    await expect(requireAdmin(as(user))).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
    await expect(requireAdmin(as(null))).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("requireCandidate", () => {
  it("needs a candidate profile", async () => {
    const lookup = vi.fn(async () => true);
    await expect(requireCandidate(lookup, as(user))).resolves.toBe(user);
    expect(lookup).toHaveBeenCalledWith(user.id);
  });

  it("answers 404 without a profile and 401 without a session", async () => {
    await expect(
      requireCandidate(async () => false, as(user)),
    ).rejects.toMatchObject({ status: 404 });
    const lookup = vi.fn(async () => true);
    await expect(requireCandidate(lookup, as(null))).rejects.toMatchObject({
      status: 401,
    });
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("requireMembership", () => {
  it("returns the user and role for an allowed role", async () => {
    const findRole = vi.fn(async () => "recruiter" as const);
    await expect(
      requireMembership(
        companyId,
        ["owner", "admin", "recruiter"],
        findRole,
        as(user),
      ),
    ).resolves.toEqual({ user, role: "recruiter" });
    expect(findRole).toHaveBeenCalledWith(companyId, user.id);
  });

  it("answers 404 to a non-member: the company is not theirs", async () => {
    await expect(
      requireMembership(companyId, ["owner"], async () => null, as(user)),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("answers 403 to a member without the role", async () => {
    await expect(
      requireMembership(
        companyId,
        ["owner", "admin", "recruiter"],
        async () => "member" as const,
        as(user),
      ),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("answers 401 to a guest before looking up membership", async () => {
    const findRole = vi.fn(async () => "owner" as const);
    await expect(
      requireMembership(companyId, ["owner"], findRole, as(null)),
    ).rejects.toMatchObject({ status: 401 });
    expect(findRole).not.toHaveBeenCalled();
  });
});
