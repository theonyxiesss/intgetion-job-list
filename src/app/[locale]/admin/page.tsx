import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import {
  EmptyState,
  Stat,
  StatRow,
  StatusDot,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import {
  countNewUsers,
  countPendingSkillSuggestions,
  countPublishedJobs,
  listAudit,
} from "@/modules/admin/service";
import {
  countOpenReports,
  countPendingQueue,
  listQueue,
} from "@/modules/moderation/service";

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const [suggestions, queue, reports, newUsers, published, overduePage, audit] =
    await Promise.all([
      countPendingSkillSuggestions(),
      countPendingQueue(),
      countOpenReports(),
      countNewUsers(),
      countPublishedJobs(),
      listQueue({ limit: 50 }),
      listAudit({ limit: 10 }),
    ]);
  const overdue = overduePage.items.filter((item) => item.overdue).slice(0, 10);
  const stats = [
    { label: t("statQueue"), value: queue, href: "/admin/moderation" },
    { label: t("statReports"), value: reports, href: "/admin/reports" },
    {
      label: t("statSuggestions"),
      value: suggestions,
      href: "/admin/taxonomy",
    },
    { label: t("statNewUsers"), value: newUsers, href: "/admin/users" },
    { label: t("statPublished"), value: published, href: "/admin/jobs" },
  ];

  return (
    <AdminShell title={t("overviewTitle")} active="home" intro={t("laterNote")}>
      <StatRow className="min-w-0">
        {stats.map((stat) => (
          <Link key={stat.href} href={stat.href} className="block min-w-0">
            <Stat large label={stat.label} value={stat.value} />
          </Link>
        ))}
      </StatRow>
      <section className="flex flex-col gap-4">
        <h2 className="t-h3">{t("overdueTitle")}</h2>
        {overdue.length === 0 ? (
          <EmptyState title={t("overdueEmpty")} />
        ) : (
          <ul className="flex flex-col border border-line">
            {overdue.map((item) => (
              <li
                key={item.id}
                className="border-b border-line last:border-b-0"
              >
                <Link
                  href={{
                    pathname: "/admin/moderation",
                    query: { entityType: item.entityType },
                  }}
                  className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-surface-2"
                >
                  <StatusDot tone="warning" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {item.subject?.title ?? t("entityMissing")}
                    </span>
                    <span className="t-label text-warning">{t("overdue")}</span>
                  </span>
                  <span className="t-data shrink-0 text-fg-muted">
                    {item.createdAt.slice(0, 16).replace("T", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="t-h3">{t("recentAudit")}</h2>
        {audit.items.length === 0 ? (
          <EmptyState title={t("auditEmpty")} />
        ) : (
          <Table className="min-w-0" caption={t("recentAudit")}>
            <thead>
              <tr>
                <Th>{t("colTime")}</Th>
                <Th>{t("colAction")}</Th>
                <Th>{t("colEntity")}</Th>
              </tr>
            </thead>
            <tbody>
              {audit.items.map((entry) => (
                <Tr key={entry.id}>
                  <Td mono className="whitespace-nowrap">
                    {entry.createdAt.slice(0, 16).replace("T", " ")}
                  </Td>
                  <Td className="break-all">{entry.action}</Td>
                  <Td className="break-all">
                    {entry.entityType}
                    {entry.entityId ? ` ${entry.entityId.slice(0, 8)}` : ""}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </AdminShell>
  );
}
