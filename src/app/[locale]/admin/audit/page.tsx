import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { Link } from "@/i18n/navigation";
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
    <AdminShell title={t("auditTitle")}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th scope="col">{t("colTime")}</th>
            <th scope="col">{t("colAction")}</th>
            <th scope="col">{t("colEntity")}</th>
            <th scope="col">{t("colActor")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-t border-current/15">
              <td className="py-2">
                {row.createdAt.replace("T", " ").slice(0, 19)}
              </td>
              <td className="font-mono text-xs">{row.action}</td>
              <td className="font-mono text-xs">
                {row.entityType}:{row.entityId ?? "-"}
              </td>
              <td className="font-mono text-xs">{row.actorId ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextCursor && (
        <Link
          href={{ pathname: "/admin/audit", query: { cursor: nextCursor } }}
          className="underline"
        >
          {t("nextPage")}
        </Link>
      )}
    </AdminShell>
  );
}
