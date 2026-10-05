import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { UserStatusAction } from "@/components/admin/admin-actions";
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
import { getAuthUserEmail } from "@/lib/supabase/admin";
import { getUserPanel } from "@/modules/admin/service";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const admin = await requireAdminPage();
  if (!z.uuid().safeParse(id).success) notFound();
  const panel = await getUserPanel(id);
  if (!panel) notFound();
  const t = await getTranslations("admin");
  const { user, memberships, applicationCount, audit } = panel;
  const email = await getAuthUserEmail(user.authUid);

  return (
    <AdminShell title={t("userTitle")} active="users">
      <StatRow>
        <Stat label={t("colRole")} value={user.platformRole} />
        <Stat label={t("colStatus")} value={user.status} />
        <Stat
          label={t("colCreated")}
          value={user.createdAt.toISOString().slice(0, 10)}
        />
        <Stat
          label={t("lastActive")}
          value={
            user.lastActiveAt
              ? user.lastActiveAt.toISOString().slice(0, 10)
              : t("notSet")
          }
          muted={!user.lastActiveAt}
        />
        <Stat label={t("applicationsCount")} value={applicationCount} />
        <Stat
          label={t("colEmail")}
          value={email ?? t("emailMissing")}
          muted={!email}
        />
      </StatRow>
      <p className="t-data break-all text-fg-muted">{user.id}</p>
      {user.id !== admin.id && user.platformRole !== "admin" && (
        <UserStatusAction userId={user.id} status={user.status} />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="t-h3">{t("userCompanies")}</h2>
        {memberships.length === 0 ? (
          <EmptyState title={t("userCompaniesEmpty")} />
        ) : (
          <Table caption={t("userCompanies")}>
            <thead>
              <tr>
                <Th>{t("colName")}</Th>
                <Th>{t("colRole")}</Th>
                <Th>{t("colStatus")}</Th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((company) => (
                <Tr key={company.id}>
                  <Td>
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {company.name}
                    </Link>
                  </Td>
                  <Td>{company.role}</Td>
                  <Td>
                    <StatusBadge status={company.status}>
                      {company.status}
                    </StatusBadge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="t-h3">{t("userAudit")}</h2>
        {audit.length === 0 ? (
          <EmptyState title={t("auditEmpty")} />
        ) : (
          <Table caption={t("userAudit")}>
            <thead>
              <tr>
                <Th>{t("colTime")}</Th>
                <Th>{t("colAction")}</Th>
                <Th>{t("colEntity")}</Th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <Tr key={entry.id}>
                  <Td mono className="whitespace-nowrap">
                    {entry.createdAt
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}
                  </Td>
                  <Td className="break-all">{entry.action}</Td>
                  <Td className="break-all">{entry.entityType}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </AdminShell>
  );
}
