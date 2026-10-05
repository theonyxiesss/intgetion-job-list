import {
  Building2,
  ChartColumn,
  Download,
  Flag,
  LayoutGrid,
  ListChecks,
  ScrollText,
  Tags,
  Users,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSectionMenu } from "@/components/admin/admin-section-menu";
import { Container, Icon, PageHeader, cn, navFade } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countPendingSkillSuggestions } from "@/modules/admin/service";
import { getCurrentUser, type CurrentUser } from "@/modules/auth/service";
import {
  countOpenReports,
  countPendingQueue,
} from "@/modules/moderation/service";

/**
 * Every admin page calls this itself; layouts are not re-run on every
 * navigation, so they cannot be the only check. Non-admins and guests get
 * the 404 page (section 5.1, P7).
 */
export async function requireAdminPage(): Promise<CurrentUser> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  if (!user || user.platformRole !== "admin") notFound();
  return user;
}

export type AdminSection =
  | "home"
  | "moderation"
  | "reports"
  | "jobs"
  | "companies"
  | "users"
  | "import"
  | "taxonomy"
  | "audit"
  | "metrics";

const sections: {
  key: AdminSection;
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "home", href: "/admin", label: "navHome", icon: LayoutGrid },
  {
    key: "moderation",
    href: "/admin/moderation",
    label: "navModeration",
    icon: ListChecks,
  },
  { key: "reports", href: "/admin/reports", label: "navReports", icon: Flag },
  { key: "jobs", href: "/admin/jobs", label: "navJobs", icon: Briefcase },
  {
    key: "companies",
    href: "/admin/companies",
    label: "navCompanies",
    icon: Building2,
  },
  { key: "users", href: "/admin/users", label: "navUsers", icon: Users },
  { key: "import", href: "/admin/import", label: "navImport", icon: Download },
  {
    key: "taxonomy",
    href: "/admin/taxonomy",
    label: "navTaxonomy",
    icon: Tags,
  },
  { key: "audit", href: "/admin/audit", label: "navAudit", icon: ScrollText },
  {
    key: "metrics",
    href: "/admin/metrics",
    label: "navMetrics",
    icon: ChartColumn,
  },
];

/**
 * Admin "control room" (DESIGN.md 9.11): a vertical section list with
 * live counters on the left, the page on the right; on phones the list
 * becomes a scrollable row above the page.
 */
export async function AdminShell({
  title,
  active,
  intro,
  actions,
  children,
}: {
  title: string;
  active: AdminSection;
  intro?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = await getTranslations("admin");
  const [queue, reports, suggestions] = await Promise.all([
    countPendingQueue(),
    countOpenReports(),
    countPendingSkillSuggestions(),
  ]);
  const counts: Partial<Record<AdminSection, number>> = {
    moderation: queue,
    reports,
    taxonomy: suggestions,
  };

  return (
    <main className="min-w-0 flex-1 overflow-x-hidden py-10">
      <Container className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <nav
          aria-label={t("navLabel")}
          className="w-full min-w-0 shrink-0 lg:w-[220px]"
        >
          <p className="t-label mb-3 hidden text-fg-subtle lg:block">
            {t("title")}
          </p>
          <AdminSectionMenu
            label={t("navLabel")}
            active={active}
            sections={sections.map((section) => {
              const count = counts[section.key];
              const name = t(section.label);
              return {
                key: section.key,
                href: section.href,
                label: count === undefined ? name : `${name} (${count})`,
              };
            })}
          />
          <ul className="hidden lg:flex lg:flex-col lg:gap-0 lg:border-l lg:border-line">
            {sections.map((section) => {
              const current = section.key === active;
              const count = counts[section.key];
              return (
                <li key={section.key}>
                  <Link
                    {...navFade}
                    href={section.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "t-nav flex min-h-11 items-center gap-3 px-3 transition-colors duration-[120ms] lg:-ml-px lg:border-l-2 lg:pl-4",
                      current
                        ? "border-accent text-fg"
                        : "border-transparent text-fg-muted hover:text-fg",
                    )}
                  >
                    <Icon icon={section.icon} size={16} />
                    <span className="min-w-0 flex-1">{t(section.label)}</span>
                    {count !== undefined && (
                      <span
                        className={
                          count > 0
                            ? "t-data shrink-0 text-signal"
                            : "t-data shrink-0 text-fg-muted"
                        }
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex min-w-0 max-w-full flex-1 flex-col gap-8 overflow-x-hidden">
          <PageHeader
            label={t("title")}
            title={title}
            intro={intro}
            actions={actions}
          />
          {children}
        </div>
      </Container>
    </main>
  );
}

/** "Next page" link at the end of an admin list. */
export async function NextPageLink({
  href,
}: {
  href: { pathname: string; query: Record<string, string> };
}) {
  const t = await getTranslations("admin");
  return (
    <Link
      {...navFade}
      href={href}
      className="t-nav inline-flex min-h-11 items-center self-start text-fg-muted underline-offset-4 hover:text-fg hover:underline"
    >
      {t("nextPage")}
    </Link>
  );
}
