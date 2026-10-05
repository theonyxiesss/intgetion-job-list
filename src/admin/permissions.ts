/**
 * Admin roles and the permission table in docs/ADMIN.md section 4.2.
 * A missing right is a 404, the same answer a stranger gets.
 */

export const ADMIN_ROLES = [
  "owner",
  "admin",
  "moderator",
  "support",
  "analyst",
  "marketing",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  "overview.read",
  "monitoring.read",
  "analytics.read",
  "users.read",
  "users.pii.read",
  "users.bot.read",
  "users.suspend",
  "users.unsuspend",
  "users.signout",
  "users.reset_password",
  "users.note",
  "users.edit",
  "users.ban",
  "users.delete",
  "users.impersonate",
  "users.export",
  "companies.read",
  "jobs.read",
  "companies.verify",
  "companies.suspend",
  "jobs.remove",
  "moderation.decide",
  "reports.decide",
  "import.manage",
  "taxonomy.manage",
  "broadcast.draft",
  "broadcast.send",
  "broadcast.approve",
  "jobs_scheduler.read",
  "jobs_scheduler.manage",
  "jobs_scheduler.run",
  "settings.read",
  "flags.manage",
  "admins.manage",
  "audit.read",
  "emergency.readonly",
  "emergency.signout",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type AuditScope = "all" | "own" | "none";

const everyone: AdminPermission[] = [
  "overview.read",
  "monitoring.read",
  "analytics.read",
];

const granted: Record<AdminRole, readonly AdminPermission[]> = {
  owner: ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS.filter(
    (perm) =>
      perm !== "flags.manage" &&
      perm !== "admins.manage" &&
      perm !== "emergency.readonly" &&
      perm !== "emergency.signout",
  ),
  moderator: [
    ...everyone,
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
    ...everyone,
    "users.read",
    "users.pii.read",
    "users.signout",
    "users.reset_password",
    "users.note",
    "companies.read",
    "jobs.read",
    "audit.read",
  ],
  analyst: [...everyone, "companies.read", "jobs.read", "jobs_scheduler.read"],
  marketing: [...everyone, "broadcast.draft", "broadcast.send", "audit.read"],
};

const grantSet: Record<AdminRole, Set<AdminPermission>> = {
  owner: new Set(granted.owner),
  admin: new Set(granted.admin),
  moderator: new Set(granted.moderator),
  support: new Set(granted.support),
  analyst: new Set(granted.analyst),
  marketing: new Set(granted.marketing),
};

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

export function can(role: AdminRole, permission: AdminPermission): boolean {
  return grantSet[role].has(permission);
}

/** `audit.read` is all rows, only the caller's rows, or none. */
export function auditScope(role: AdminRole): AuditScope {
  if (role === "owner" || role === "admin") return "all";
  if (role === "analyst") return "none";
  return "own";
}
