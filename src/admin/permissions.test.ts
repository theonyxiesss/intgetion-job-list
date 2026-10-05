import { describe, expect, it } from "vitest";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  auditScope,
  can,
  type AdminPermission,
  type AdminRole,
} from "./permissions";

/**
 * Independent copy of docs/ADMIN.md 4.2. `can` must match this table,
 * not the other way around.
 */
const granted: Record<AdminRole, readonly AdminPermission[]> = {
  owner: [...ADMIN_PERMISSIONS],
  admin: ADMIN_PERMISSIONS.filter(
    (perm) =>
      perm !== "flags.manage" &&
      perm !== "admins.manage" &&
      perm !== "emergency.readonly" &&
      perm !== "emergency.signout",
  ),
  moderator: [
    "overview.read",
    "monitoring.read",
    "analytics.read",
    "users.read",
    "users.pii.read",
    "users.suspend",
    "users.unsuspend",
    "users.signout",
    "users.reset_password",
    "users.note",
    "users.edit",
    "companies.read",
    "jobs.read",
    "companies.verify",
    "companies.suspend",
    "jobs.remove",
    "moderation.decide",
    "reports.decide",
    "import.manage",
    "taxonomy.manage",
    "jobs_scheduler.read",
    "audit.read",
  ],
  support: [
    "overview.read",
    "monitoring.read",
    "analytics.read",
    "users.read",
    "users.pii.read",
    "users.signout",
    "users.reset_password",
    "users.note",
    "companies.read",
    "jobs.read",
    "audit.read",
  ],
  analyst: [
    "overview.read",
    "monitoring.read",
    "analytics.read",
    "companies.read",
    "jobs.read",
    "jobs_scheduler.read",
  ],
  marketing: [
    "overview.read",
    "monitoring.read",
    "analytics.read",
    "broadcast.draft",
    "broadcast.send",
    "audit.read",
  ],
};

describe("admin permissions", () => {
  it("covers every role and every right in section 4.2", () => {
    expect(ADMIN_ROLES).toEqual([
      "owner",
      "admin",
      "moderator",
      "support",
      "analyst",
      "marketing",
    ]);
    expect(new Set(ADMIN_PERMISSIONS).size).toBe(ADMIN_PERMISSIONS.length);
    for (const role of ADMIN_ROLES) {
      for (const permission of ADMIN_PERMISSIONS) {
        expect(can(role, permission)).toBe(granted[role].includes(permission));
      }
    }
  });

  it("limits the audit log to own rows except owner and admin", () => {
    expect(auditScope("owner")).toBe("all");
    expect(auditScope("admin")).toBe("all");
    expect(auditScope("moderator")).toBe("own");
    expect(auditScope("support")).toBe("own");
    expect(auditScope("marketing")).toBe("own");
    expect(auditScope("analyst")).toBe("none");
    expect(can("analyst", "audit.read")).toBe(false);
    expect(can("moderator", "audit.read")).toBe(true);
  });
});
