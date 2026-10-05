import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CompanyStatusAction } from "@/components/admin/admin-actions";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import {
  EmptyState,
  Stat,
  StatRow,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCompanyPanel } from "@/modules/admin/service";

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  if (!z.uuid().safeParse(id).success) notFound();
  const panel = await getCompanyPanel(id);
  if (!panel) notFound();
  const t = await getTranslations("admin");
  const { company, members, jobs, verifications } = panel;

  return (
    <AdminShell title={company.name} active="companies" intro={company.slug}>
      <StatRow>
        <Stat label={t("colStatus")} value={company.status} />
        <Stat
          label={t("colTrusted")}
          value={company.isTrusted ? t("trustedYes") : t("trustedNo")}
        />
        <Stat label={t("colJobs")} value={company.jobCount} />
        <Stat
          label={t("colCreated")}
          value={company.createdAt.toISOString().slice(0, 10)}
        />
      </StatRow>
      <p className="t-body-s break-all text-fg-muted">
        {[company.domain, company.websiteUrl, company.country]
          .filter(Boolean)
          .join(" · ") || t("notSet")}
      </p>
      <CompanyStatusAction companyId={company.id} status={company.status} />

      <section className="flex flex-col gap-4">
        <h2 className="t-h3">{t("colMembers")}</h2>
        {members.length === 0 ? (
          <EmptyState title={t("membersEmpty")} />
        ) : (
          <Table caption={t("colMembers")}>
            <thead>
              <tr>
                <Th>{t("colId")}</Th>
                <Th>{t("colRole")}</Th>
                <Th>{t("colCreated")}</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <Tr key={member.userId}>
                  <Td className="break-all">
                    <Link
                      href={`/admin/users/${member.userId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {member.userId}
                    </Link>
                  </Td>
                  <Td>{member.role}</Td>
                  <Td mono>{member.createdAt.toISOString().slice(0, 10)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="t-h3">{t("companyJobs")}</h2>
        {jobs.length === 0 ? (
          <EmptyState title={t("companyJobsEmpty")} />
        ) : (
          <Table caption={t("companyJobs")}>
            <thead>
              <tr>
                <Th>{t("colTitle")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th>{t("colCreated")}</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <Tr key={job.id}>
                  <Td>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {job.title}
                    </Link>
                  </Td>
                  <Td>
                    <StatusBadge status={job.status}>{job.status}</StatusBadge>
                  </Td>
                  <Td mono>{job.createdAt.toISOString().slice(0, 10)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="t-h3">{t("verificationHistory")}</h2>
        {verifications.length === 0 ? (
          <EmptyState title={t("verificationEmpty")} />
        ) : (
          <Table caption={t("verificationHistory")}>
            <thead>
              <tr>
                <Th>{t("colTime")}</Th>
                <Th>{t("colKind")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th>{t("colTarget")}</Th>
              </tr>
            </thead>
            <tbody>
              {verifications.map((row) => (
                <Tr key={row.id}>
                  <Td mono>{row.createdAt.toISOString().slice(0, 10)}</Td>
                  <Td>{row.method}</Td>
                  <Td>
                    <StatusBadge status={row.status}>{row.status}</StatusBadge>
                  </Td>
                  <Td className="break-all">{row.target}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </AdminShell>
  );
}
