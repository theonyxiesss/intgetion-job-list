import { Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RemoveJobAction } from "@/components/admin/admin-actions";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  Input,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import {
  listAdminJobs,
  listAdminJobsQuery,
} from "@/modules/moderation/service";

export default async function AdminJobsPage({
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
  const raw = await searchParams;
  const query = listAdminJobsQuery.safeParse(raw);
  const { items, nextCursor } = await listAdminJobs(
    query.success ? query.data : listAdminJobsQuery.parse({}),
  );

  return (
    <AdminShell title={t("jobsTitle")} active="jobs">
      <form role="search" className="flex max-w-xl gap-2">
        <label htmlFor="admin-jobs-q" className="sr-only">
          {t("searchTitle")}
        </label>
        <Input
          id="admin-jobs-q"
          name="q"
          defaultValue={raw.q ?? ""}
          placeholder={t("searchTitle")}
        />
        <Button
          type="submit"
          variant="secondary"
          icon={<Icon icon={Search} size={16} />}
        >
          {t("search")}
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyState title={t("jobsEmpty")} />
      ) : (
        <Table caption={t("jobsTitle")}>
          <thead>
            <tr>
              <Th>{t("colTitle")}</Th>
              <Th>{t("colSource")}</Th>
              <Th>{t("colStatus")}</Th>
              <Th numeric>{t("colRisk")}</Th>
              <Th>{t("colActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((job) => (
              <Tr key={job.id}>
                <Td>
                  <Link
                    href={`/admin/jobs/${job.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {job.title}
                  </Link>
                  <span className="t-caption block text-fg-muted">
                    {job.companyName}
                  </span>
                </Td>
                <Td>
                  {job.source === "imported" ? (
                    <Badge tone="imported">{t("imported")}</Badge>
                  ) : (
                    <Badge>{t("internal")}</Badge>
                  )}
                </Td>
                <Td>
                  <StatusBadge status={job.status}>{job.status}</StatusBadge>
                </Td>
                <Td numeric>{job.riskScore}</Td>
                <Td>
                  {job.status !== "removed" && (
                    <RemoveJobAction jobId={job.id} />
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {nextCursor && (
        <NextPageLink
          href={{
            pathname: "/admin/jobs",
            query: { ...(raw.q ? { q: raw.q } : {}), cursor: nextCursor },
          }}
        />
      )}
    </AdminShell>
  );
}
