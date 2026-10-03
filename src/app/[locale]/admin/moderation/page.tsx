import { getTranslations, setRequestLocale } from "next-intl/server";
import { QueueDecision } from "@/components/admin/admin-actions";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { Link } from "@/i18n/navigation";
import { listQueue, listQueueQuery } from "@/modules/moderation/service";

export default async function AdminModerationPage({
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
  const query = listQueueQuery.safeParse(await searchParams);
  const { items, nextCursor } = await listQueue(
    query.success ? query.data : listQueueQuery.parse({}),
  );

  return (
    <AdminShell title={t("moderationTitle")}>
      {items.length === 0 ? (
        <p>{t("queueEmpty")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th scope="col">{t("colTime")}</th>
              <th scope="col">{t("colEntity")}</th>
              <th scope="col">{t("colReason")}</th>
              <th scope="col">{t("colRisk")}</th>
              <th scope="col">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-current/15">
                <td className="py-2">
                  {item.createdAt.slice(0, 16).replace("T", " ")}
                  {item.overdue && (
                    <strong className="ml-2 text-danger">{t("overdue")}</strong>
                  )}
                </td>
                <td>
                  <span className="block text-xs opacity-80">
                    {item.entityType}
                    {item.subject?.source ? ` · ${item.subject.source}` : ""}
                    {item.subject ? ` · ${item.subject.status}` : ""}
                  </span>
                  {item.subject?.title ?? t("entityMissing")}
                  {item.subject?.companyName && (
                    <span className="block text-xs opacity-80">
                      {item.subject.companyName}
                    </span>
                  )}
                </td>
                <td>{item.reason}</td>
                <td>{item.subject?.riskScore ?? "—"}</td>
                <td>
                  <QueueDecision itemId={item.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {nextCursor && (
        <Link
          href={{
            pathname: "/admin/moderation",
            query: { cursor: nextCursor },
          }}
          className="underline"
        >
          {t("nextPage")}
        </Link>
      )}
    </AdminShell>
  );
}
