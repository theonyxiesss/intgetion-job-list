import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import { EmptyState, Table, Td, Th, Tr } from "@/components/ui";
import { listAudit, listAuditQuery } from "@/modules/admin/service";

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const query = listAuditQuery.safeParse(await searchParams);
  const { items, nextCursor } = await listAudit(
    query.success ? query.data : listAuditQuery.parse({}),
  );

  return (
    <AdminShell title={t("auditTitle")} active="audit">
      {items.length === 0 ? (
        <EmptyState title={t("auditEmpty")} />
      ) : (
        <Table className="min-w-0" caption={t("auditTitle")}>
          <thead>
            <tr>
              <Th>{t("colTime")}</Th>
              <Th>{t("colAction")}</Th>
              <Th>{t("colEntity")}</Th>
              <Th>{t("colActor")}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <Tr key={row.id}>
                <Td mono className="whitespace-nowrap">
                  {row.createdAt.replace("T", " ").slice(0, 19)}
                </Td>
                <Td mono>{row.action}</Td>
                <Td mono className="text-fg-muted">
                  {row.entityType}:{row.entityId ?? "—"}
                </Td>
                <Td mono className="text-fg-muted">
                  {row.actorId ?? "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {nextCursor && (
        <NextPageLink
          href={{ pathname: "/admin/audit", query: { cursor: nextCursor } }}
        />
      )}
    </AdminShell>
  );
}
