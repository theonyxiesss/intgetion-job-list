import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, type CurrentUser } from "@/modules/auth/service";

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

export async function AdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const t = await getTranslations("admin");
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <nav aria-label={t("navLabel")} className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin" className="underline">
          {t("navHome")}
        </Link>
        <Link href="/admin/moderation" className="underline">
          {t("navModeration")}
        </Link>
        <Link href="/admin/reports" className="underline">
          {t("navReports")}
        </Link>
        <Link href="/admin/jobs" className="underline">
          {t("navJobs")}
        </Link>
        <Link href="/admin/import" className="underline">
          {t("navImport")}
        </Link>
        <Link href="/admin/users" className="underline">
          {t("navUsers")}
        </Link>
        <Link href="/admin/audit" className="underline">
          {t("navAudit")}
        </Link>
        <Link href="/admin/taxonomy" className="underline">
          {t("navTaxonomy")}
        </Link>
      </nav>
      <h1 className="text-3xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}
