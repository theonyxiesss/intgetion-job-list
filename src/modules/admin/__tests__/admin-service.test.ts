import { beforeEach, describe, expect, it, vi } from "vitest";
import * as audit from "@/lib/audit";
import type { CurrentUser } from "@/modules/auth/service";
import * as companiesService from "@/modules/companies/service";
import * as taxonomy from "@/modules/taxonomy/service";
import * as repo from "../repo/admin-repo";
import {
  listAudit,
  mapSuggestion,
  rejectSuggestion,
  suspendCompany,
  suspendUser,
  unsuspendCompany,
  unsuspendUser,
} from "../service/admin-service";

vi.mock("../repo/admin-repo", () => ({
  findUser: vi.fn(),
  setUserStatus: vi.fn(),
  listUsers: vi.fn(),
  listAudit: vi.fn(),
  listCompanies: vi.fn(),
  findCompany: vi.fn(),
  findStatusBeforeSuspension: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/modules/taxonomy/service", () => ({
  listSkillSuggestions: vi.fn(),
  mapSkillSuggestion: vi.fn(),
  rejectSkillSuggestion: vi.fn(),
}));
vi.mock("@/modules/companies/service", () => ({
  changeCompanyStatus: vi.fn(),
}));

const r = vi.mocked(repo);
const recordAudit = vi.mocked(audit.recordAudit);
const tx = vi.mocked(taxonomy);
const changeCompanyStatus = vi.mocked(companiesService.changeCompanyStatus);

const at = new Date("2026-10-03T10:00:00Z");
const admin: CurrentUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  authUid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  platformRole: "admin",
  accountType: "candidate",
  status: "active",
  locale: "en",
  termsAcceptedAt: at,
  termsVersion: "2026-10-03",
  marketingOptIn: false,
  lastActiveAt: null,
  createdAt: at,
  updatedAt: at,
  deletedAt: null,
};
const target = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  platformRole: "user" as const,
  accountType: "candidate" as const,
  status: "active" as const,
  locale: "en",
  createdAt: at,
  lastActiveAt: null,
};
const ip = "203.0.113.9";

beforeEach(() => vi.clearAllMocks());

describe("suspendUser", () => {
  it("suspends an active user and audits it with the admin as actor (P16)", async () => {
    r.findUser.mockResolvedValue(target);
    r.setUserStatus.mockResolvedValue({ ...target, status: "suspended" });
    const dto = await suspendUser(admin, target.id, { note: "spam" }, ip);
    expect(dto.status).toBe("suspended");
    expect(r.setUserStatus).toHaveBeenCalledWith(
      target.id,
      "active",
      "suspended",
    );
    expect(recordAudit).toHaveBeenCalledWith({
      actorId: admin.id,
      action: "admin.user_suspended",
      entityType: "user",
      entityId: target.id,
      diff: { from: "active", to: "suspended", note: "spam" },
      ip,
    });
  });

  it("answers 404 for an unknown user", async () => {
    r.findUser.mockResolvedValue(undefined);
    await expect(suspendUser(admin, target.id, {}, ip)).rejects.toMatchObject({
      status: 404,
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("refuses to suspend oneself or another admin", async () => {
    r.findUser.mockResolvedValue({ ...target, id: admin.id });
    await expect(suspendUser(admin, admin.id, {}, ip)).rejects.toMatchObject({
      status: 422,
      code: "ADMIN_PROTECTED",
    });
    r.findUser.mockResolvedValue({ ...target, platformRole: "admin" });
    await expect(suspendUser(admin, target.id, {}, ip)).rejects.toMatchObject({
      status: 422,
    });
    expect(r.setUserStatus).not.toHaveBeenCalled();
  });

  it("answers 409 when the user is not active and writes no audit", async () => {
    r.findUser.mockResolvedValue({ ...target, status: "deleted" });
    r.setUserStatus.mockResolvedValue(undefined);
    await expect(suspendUser(admin, target.id, {}, ip)).rejects.toMatchObject({
      status: 409,
      code: "INVALID_TRANSITION",
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("unsuspendUser", () => {
  it("reactivates a suspended user and audits it", async () => {
    r.findUser.mockResolvedValue({ ...target, status: "suspended" });
    r.setUserStatus.mockResolvedValue(target);
    await unsuspendUser(admin, target.id, {}, ip);
    expect(r.setUserStatus).toHaveBeenCalledWith(
      target.id,
      "suspended",
      "active",
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.user_unsuspended" }),
    );
  });
});

describe("skill suggestions", () => {
  const suggestion = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    rawText: "ReactJS!!",
    normalized: "reactjs",
    source: "user",
    occurrences: 4,
    createdAt: at.toISOString(),
  };
  const skillId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

  it("maps and audits", async () => {
    tx.mapSkillSuggestion.mockResolvedValue(suggestion);
    await mapSuggestion(admin, suggestion.id, skillId, ip);
    expect(recordAudit).toHaveBeenCalledWith({
      actorId: admin.id,
      action: "admin.skill_suggestion_mapped",
      entityType: "skill_suggestion",
      entityId: suggestion.id,
      diff: { normalized: "reactjs", skillId },
      ip,
    });
  });

  it("rejects and audits", async () => {
    tx.rejectSkillSuggestion.mockResolvedValue(suggestion);
    await rejectSuggestion(admin, suggestion.id, ip);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.skill_suggestion_rejected" }),
    );
  });

  it("writes no audit when the mapping fails", async () => {
    tx.mapSkillSuggestion.mockRejectedValue(new Error("conflict"));
    await expect(
      mapSuggestion(admin, suggestion.id, skillId, ip),
    ).rejects.toThrow("conflict");
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("listAudit", () => {
  it("pages with a cursor and never exposes ip_hash", async () => {
    const rows = [0, 1, 2].map((i) => ({
      id: `0000000${i}-0000-4000-8000-000000000000`,
      actorId: admin.id,
      action: "admin.user_suspended",
      entityType: "user",
      entityId: target.id,
      diff: null,
      ipHash: "secret-hash",
      reason: null,
      requestId: null,
      deviceClass: null,
      createdAt: new Date(at.getTime() - i * 1000),
    }));
    r.listAudit.mockResolvedValue(rows);
    const result = await listAudit({ limit: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain("secret-hash");
    expect(r.listAudit).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 }),
    );

    r.listAudit.mockResolvedValue([]);
    await listAudit({ limit: 2, cursor: result.nextCursor ?? undefined });
    expect(r.listAudit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { createdAt: rows[1]!.createdAt, id: rows[1]!.id },
      }),
    );
  });

  it("rejects a forged cursor with 400", async () => {
    await expect(
      listAudit({ limit: 2, cursor: "not-a-cursor" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("company suspension (D81)", () => {
  const company = {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    name: "Acme",
    slug: "acme",
    status: "verified" as const,
    origin: "internal" as const,
    createdAt: at,
  };

  it("suspends through the companies service with the admin as actor", async () => {
    r.findCompany.mockResolvedValue(company);
    const dto = await suspendCompany(admin, company.id);
    expect(changeCompanyStatus).toHaveBeenCalledWith(
      company.id,
      admin.id,
      "suspended",
    );
    expect(dto.status).toBe("suspended");
  });

  it("answers 404 for an unknown company and 409 when already suspended", async () => {
    r.findCompany.mockResolvedValue(undefined);
    await expect(suspendCompany(admin, company.id)).rejects.toMatchObject({
      status: 404,
    });
    r.findCompany.mockResolvedValue({ ...company, status: "suspended" });
    await expect(suspendCompany(admin, company.id)).rejects.toMatchObject({
      status: 409,
    });
    expect(changeCompanyStatus).not.toHaveBeenCalled();
  });

  it("restores the status the company had before the suspension", async () => {
    r.findCompany.mockResolvedValue({ ...company, status: "suspended" });
    r.findStatusBeforeSuspension.mockResolvedValue("verified");
    const dto = await unsuspendCompany(admin, company.id);
    expect(changeCompanyStatus).toHaveBeenCalledWith(
      company.id,
      admin.id,
      "verified",
    );
    expect(dto.status).toBe("verified");
  });

  it("falls back to unverified without a usable record", async () => {
    r.findCompany.mockResolvedValue({ ...company, status: "suspended" });
    for (const previous of [undefined, "suspended", "nonsense"]) {
      changeCompanyStatus.mockClear();
      r.findStatusBeforeSuspension.mockResolvedValue(previous);
      await unsuspendCompany(admin, company.id);
      expect(changeCompanyStatus).toHaveBeenCalledWith(
        company.id,
        admin.id,
        "unverified",
      );
    }
  });

  it("refuses to unsuspend a company that is not suspended", async () => {
    r.findCompany.mockResolvedValue(company);
    await expect(unsuspendCompany(admin, company.id)).rejects.toMatchObject({
      status: 409,
    });
  });
});
