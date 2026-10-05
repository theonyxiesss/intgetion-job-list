import {
  Briefcase,
  ChartColumn,
  Download,
  Flag,
  LayoutGrid,
  ListChecks,
  ScrollText,
  SlidersHorizontal,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can, type AdminPermission, type AdminRole } from "./permissions";

export type AdminSectionKey =
  | "home"
  | "moderation"
  | "reports"
  | "jobs"
  | "users"
  | "import"
  | "taxonomy"
  | "audit"
  | "metrics"
  | "team"
  | "flags";

export type AdminCountKey = "moderation" | "reports" | "taxonomy";

export type AdminSectionDef = {
  key: AdminSectionKey;
  href: string;
  labelKey: string;
  icon: LucideIcon;
  permission: AdminPermission;
  countKey?: AdminCountKey;
};

/** One row per section. Navigation, search, and the page gate read this. */
export const adminSections: readonly AdminSectionDef[] = [
  {
    key: "home",
    href: "/admin",
    labelKey: "navHome",
    icon: LayoutGrid,
    permission: "overview.read",
  },
  {
    key: "moderation",
    href: "/admin/moderation",
    labelKey: "navModeration",
    icon: ListChecks,
    permission: "moderation.decide",
    countKey: "moderation",
  },
  {
    key: "reports",
    href: "/admin/reports",
    labelKey: "navReports",
    icon: Flag,
    permission: "reports.decide",
    countKey: "reports",
  },
  {
    key: "jobs",
    href: "/admin/jobs",
    labelKey: "navJobs",
    icon: Briefcase,
    permission: "jobs.read",
  },
  {
    key: "users",
    href: "/admin/users",
    labelKey: "navUsers",
    icon: Users,
    permission: "users.read",
  },
  {
    key: "import",
    href: "/admin/import",
    labelKey: "navImport",
    icon: Download,
    permission: "import.manage",
  },
  {
    key: "taxonomy",
    href: "/admin/taxonomy",
    labelKey: "navTaxonomy",
    icon: Tags,
    permission: "taxonomy.manage",
    countKey: "taxonomy",
  },
  {
    key: "audit",
    href: "/admin/audit",
    labelKey: "navAudit",
    icon: ScrollText,
    permission: "audit.read",
  },
  {
    key: "metrics",
    href: "/admin/metrics",
    labelKey: "navMetrics",
    icon: ChartColumn,
    permission: "analytics.read",
  },
  {
    key: "team",
    href: "/admin/team",
    labelKey: "navTeam",
    icon: Users,
    permission: "admins.manage",
  },
  {
    key: "flags",
    href: "/admin/flags",
    labelKey: "navFlags",
    icon: SlidersHorizontal,
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
  const match = pathname.match(/^\/(?:en|ru)(\/admin(?:\/[^/]+)?)/);
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
