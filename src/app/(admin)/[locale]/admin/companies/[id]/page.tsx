import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/ui";
import { companyDetail } from "@/modules/admin-console/service";

export default async function AdminCompanyCard({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!z.uuid().safeParse(id).success) notFound();
  await requireAdminPage();
  const t = await getTranslations("admin");
  const company = await companyDetail(id).catch(() => null);
  if (!company) notFound();

  return (
    <AdminShell title={company.name} active="companies">
      <p className="t-body-s text-fg-muted">
        <StatusBadge status={company.status}>{company.status}</StatusBadge>
        {" · "}
        {company.slug}
        {company.domain ? ` · ${company.domain}` : ""}
        {company.trusted ? ` · ${t("trusted")}` : ""}
      </p>
      {company.description && (
        <p className="max-w-[68ch]">{company.description}</p>
      )}
      <p className="t-body-s">
        {t("jobsPublished", {
          published: company.jobsPublished,
          total: company.jobsTotal,
        })}
      </p>
      <ul className="flex flex-col gap-1">
        {company.members.map((member) => (
          <li key={member.id}>
            {member.name ?? member.id.slice(0, 8)} · {member.role}
          </li>
        ))}
      </ul>
      {company.notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {company.notes.map((note) => (
            <li key={note.id} className="border border-line px-3 py-2">
              <p>{note.body}</p>
              <p className="t-caption text-fg-muted">
                {note.createdAt.slice(0, 16)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
