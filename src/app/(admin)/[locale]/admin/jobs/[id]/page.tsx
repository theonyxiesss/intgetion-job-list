import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { jobDetail } from "@/modules/admin-console/service";

export default async function AdminJobCard({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!z.uuid().safeParse(id).success) notFound();
  await requireAdminPage();
  const t = await getTranslations("admin");
  const job = await jobDetail(id).catch(() => null);
  if (!job) notFound();

  return (
    <AdminShell title={job.title} active="jobs">
      <p className="t-body-s text-fg-muted">
        <StatusBadge status={job.status}>{job.status}</StatusBadge>
        {" · "}
        {job.source}
        {" · "}
        {job.category}
        {" · "}
        {t("applicationsCount", { count: job.applications })}
      </p>
      <p>
        <Link
          href={`/companies/${job.company.slug}`}
          className="underline-offset-4 hover:underline"
        >
          {job.company.name}
        </Link>
      </p>
      <p>
        <Link
          href={`/jobs/${job.id}`}
          className="underline-offset-4 hover:underline"
        >
          {t("openOnSite")}
        </Link>
      </p>
    </AdminShell>
  );
}
