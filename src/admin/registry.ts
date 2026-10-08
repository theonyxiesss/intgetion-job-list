import { can, type AdminPermission, type AdminRole } from "./permissions";

/** Names, not components: a component cannot cross into the client nav. */
export type AdminIconName =
  | "layout-grid"
  | "list-checks"
  | "flag"
  | "briefcase"
  | "building"
  | "users"
  | "download"
  | "tags"
  | "scroll-text"
  | "chart-column"
  | "sliders";

export type AdminSectionKey =
  | "home"
  | "moderation"
  | "reports"
  | "jobs"
  | "companies"
  | "users"
  | "import"
  | "taxonomy"
  | "audit"
  | "metrics"
  | "team"
  | "flags"
  | "briefs";

export type AdminCountKey = "moderation" | "reports" | "taxonomy";

export type AdminSectionDef = {
  key: AdminSectionKey;
  href: string;
  labelKey: string;
  icon: AdminIconName;
  permission: AdminPermission;
  countKey?: AdminCountKey;
};

/** One row per section. Navigation, search, and the page gate read this. */
export const adminSections: readonly AdminSectionDef[] = [
  {
    key: "home",
    href: "/admin",
    labelKey: "navHome",
    icon: "layout-grid",
    permission: "overview.read",
  },
  {
    key: "moderation",
    href: "/admin/moderation",
    labelKey: "navModeration",
    icon: "list-checks",
    permission: "moderation.decide",
    countKey: "moderation",
  },
  {
    key: "reports",
    href: "/admin/reports",
    labelKey: "navReports",
    icon: "flag",
    permission: "reports.decide",
    countKey: "reports",
  },
  {
    key: "jobs",
    href: "/admin/jobs",
    labelKey: "navJobs",
    icon: "briefcase",
    permission: "jobs.read",
  },
  {
    key: "companies",
    href: "/admin/companies",
    labelKey: "navCompanies",
    icon: "building",
    permission: "companies.read",
  },
  {
    key: "users",
    href: "/admin/users",
    labelKey: "navUsers",
    icon: "users",
    permission: "users.read",
  },
  {
    key: "import",
    href: "/admin/import",
    labelKey: "navImport",
    icon: "download",
    permission: "import.manage",
  },
  {
    key: "taxonomy",
    href: "/admin/taxonomy",
    labelKey: "navTaxonomy",
    icon: "tags",
    permission: "taxonomy.manage",
    countKey: "taxonomy",
  },
  {
    key: "audit",
    href: "/admin/audit",
    labelKey: "navAudit",
    icon: "scroll-text",
    permission: "audit.read",
  },
  {
    key: "metrics",
    href: "/admin/metrics",
    labelKey: "navMetrics",
    icon: "chart-column",
    permission: "analytics.read",
  },
  {
    key: "briefs",
    href: "/admin/briefs",
    labelKey: "navBriefs",
    icon: "sliders",
    permission: "jobs_scheduler.manage",
  },
  {
    key: "team",
    href: "/admin/team",
    labelKey: "navTeam",
    icon: "users",
    permission: "admins.manage",
  },
  {
    key: "flags",
    href: "/admin/flags",
    labelKey: "navFlags",
    icon: "sliders",
    permission: "flags.manage",
  },
];

export function sectionsFor(
  role: AdminRole | null,
  mfaEnrolled: boolean,
): readonly AdminSectionDef[] {
  if (!role || !mfaEnrolled) return [];
  return adminSections.filter((section) => can(role, section.permission));
}

/** `/en/admin/users` → the users section. Login and MFA are not sections. */
export function sectionForPath(pathname: string): AdminSectionDef | null {
  // D335: `/admin/users` (English, no prefix) or `/ru/admin/users`.
  const match = pathname.match(/^(?:\/(?:en|ru))?(\/admin(?:\/[^/]+)?)/);
  if (!match?.[1]) return null;
  const path = match[1];
  if (path === "/admin/login" || path === "/admin/mfa") return null;
  return (
    adminSections.find((section) =>
      section.href === "/admin"
        ? path === "/admin"
        : path === section.href || path.startsWith(`${section.href}/`),
    ) ?? null
  );
}
