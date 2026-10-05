import { getTranslations, setRequestLocale } from "next-intl/server";
import { QueueDecision } from "@/components/admin/admin-actions";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import {
  Badge,
  EmptyState,
  LinkTabs,
  StatusBadge,
  StatusDot,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
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
  const parsed = listQueueQuery.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : listQueueQuery.parse({});
  const entityType = query.entityType ?? "job";
  const { items, nextCursor } = await listQueue({ ...query, entityType });

  return (
    <AdminShell
      title={t("moderationTitle")}
      active="moderation"
      intro={t("moderationIntro")}
    >
      <LinkTabs
        label={t("moderationTitle")}
        items={[
          {
            label: t("tabJobs"),
            href: {
              pathname: "/admin/moderation",
              query: { entityType: "job" },
            },
            active: entityType === "job",
          },
          {
            label: t("tabCompanies"),
            href: {
              pathname: "/admin/moderation",
              query: { entityType: "company" },
            },
            active: entityType === "company",
          },
        ]}
      />
      {items.length === 0 ? (
        <EmptyState title={t("queueEmpty")} />
      ) : (
        <Table caption={t("moderationTitle")}>
          <thead>
            <tr>
              <Th>{t("colTime")}</Th>
              <Th>{t("colEntity")}</Th>
              <Th>{t("colReason")}</Th>
              <Th numeric>{t("colRisk")}</Th>
              <Th>{t("colActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td mono className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    {item.overdue && <StatusDot tone="warning" />}
                    {item.createdAt.slice(0, 16).replace("T", " ")}
                  </span>
                  {item.overdue && (
                    <span className="t-label mt-1 block text-warning">
                      {t("overdue")}
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {item.subject?.title ?? t("entityMissing")}
                    </span>
                    {item.subject?.source === "imported" && (
                      <Badge tone="imported">{t("imported")}</Badge>
                    )}
                    {item.subject && (
                      <StatusBadge status={item.subject.status}>
                        {item.subject.status}
                      </StatusBadge>
                    )}
                  </span>
                  {item.subject?.companyName && (
                    <span className="t-caption block text-fg-muted">
                      {item.subject.companyName}
                    </span>
                  )}
                </Td>
                <Td mono className="text-fg-muted">
                  {item.reason}
                </Td>
                <Td numeric>{item.subject?.riskScore ?? "—"}</Td>
                <Td>
                  <QueueDecision itemId={item.id} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {nextCursor && (
        <NextPageLink
          href={{
            pathname: "/admin/moderation",
            query: { entityType, cursor: nextCursor },
          }}
        />
      )}
    </AdminShell>
  );
}
