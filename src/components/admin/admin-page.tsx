import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdminPermission } from "@/admin/action";
import {
  sectionForPath,
  sectionsFor,
  type AdminSectionKey,
} from "@/admin/registry";
import { Container, PageHeader, navFade } from "@/components/ui";
import { HttpError } from "@/lib/http";
import { Link } from "@/i18n/navigation";
import { countPendingSkillSuggestions } from "@/modules/admin/service";
import type { CurrentUser } from "@/modules/auth/service";
import {
  countOpenReports,
  countPendingQueue,
} from "@/modules/moderation/service";
import { AdminCommand } from "./admin-command";
import { AdminNav } from "./admin-nav";
import { AdminTopBar } from "./admin-topbar";

export type AdminSection = AdminSectionKey;

/**
 * Every admin page calls this itself. Guests and roles without the right
 * get the 404 page. On the admin host the public site session is ignored.
 */
export async function requireAdminPage(): Promise<CurrentUser> {
  const headerStore = await headers();
  const section = sectionForPath(headerStore.get("x-pathname") ?? "");
  try {
    const access = await requireAdminPermission(
      section?.permission ?? "overview.read",
    );
    return access.user;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}

/**
 * Admin frame: 220px navigation, section search, theme, sessions, sign-out.
 * On a phone the navigation is a select, so the page does not scroll sideways.
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
  const ui = await getTranslations("ui");
  const headerStore = await headers();
  const section = sectionForPath(headerStore.get("x-pathname") ?? "");
  let access;
  try {
    access = await requireAdminPermission(
      section?.permission ?? "overview.read",
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const [queue, reports, suggestions] = await Promise.all([
    countPendingQueue(),
    countOpenReports(),
    countPendingSkillSuggestions(),
  ]);
  const counts = {
    moderation: queue,
    reports,
    taxonomy: suggestions,
  };
  let visible = sectionsFor(access.role ?? "owner", true);
  if (access.legacy && !access.role) {
    visible = visible.filter(
      (item) => item.key !== "team" && item.key !== "flags",
    );
  }
  const items = visible.map((item) => ({
    key: item.key,
    href: item.href,
    label: t(item.labelKey as "navHome"),
    icon: item.icon,
    count: item.countKey ? counts[item.countKey] : undefined,
    current: item.key === active,
  }));

  return (
    <main className="min-w-0 flex-1 overflow-x-hidden py-10">
      <Container className="flex min-w-0 flex-col gap-8 lg:flex-row lg:gap-12">
        <AdminNav label={t("navLabel")} title={t("title")} items={items} />
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <AdminTopBar
            sessionsLabel={t("navSessions")}
            logoutLabel={t("logout")}
            search={
              <AdminCommand
                items={items}
                label={t("searchSections")}
                placeholder={t("searchPlaceholder")}
                empty={t("searchEmpty")}
                closeLabel={ui("close")}
              />
            }
          />
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
