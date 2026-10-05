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
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { listJobsPanel } from "@/modules/admin/service";
import { listAdminJobsQuery } from "@/modules/moderation/service";

const statuses = [
  "draft",
  "pending_moderation",
  "published",
  "paused",
  "expired",
  "closed",
  "removed",
] as const;

function filled(raw: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
}

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
  const parsed = listAdminJobsQuery.safeParse(filled(raw));
  const query = parsed.success ? parsed.data : listAdminJobsQuery.parse({});
  const company = raw.company?.trim().slice(0, 100) || undefined;
  const { items, nextCursor } = await listJobsPanel({ ...query, company });
  const filters = {
    ...(raw.q ? { q: raw.q } : {}),
    ...(raw.status ? { status: raw.status } : {}),
    ...(raw.source ? { source: raw.source } : {}),
    ...(company ? { company } : {}),
  };

  return (
    <AdminShell title={t("jobsTitle")} active="jobs">
      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        <label htmlFor="admin-jobs-q" className="sr-only">
          {t("searchTitle")}
        </label>
        <Input
          id="admin-jobs-q"
          name="q"
          defaultValue={raw.q ?? ""}
          placeholder={t("searchTitle")}
          className="sm:max-w-xs"
        />
        <label htmlFor="admin-jobs-status" className="sr-only">
          {t("colStatus")}
        </label>
        <Select
          id="admin-jobs-status"
          name="status"
          defaultValue={raw.status ?? ""}
          className="sm:w-auto"
        >
          <option value="">{t("anyStatus")}</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <label htmlFor="admin-jobs-source" className="sr-only">
          {t("colSource")}
        </label>
        <Select
          id="admin-jobs-source"
          name="source"
          defaultValue={raw.source ?? ""}
          className="sm:w-auto"
        >
          <option value="">{t("anySource")}</option>
          <option value="internal">{t("internal")}</option>
          <option value="imported">{t("imported")}</option>
        </Select>
        <label htmlFor="admin-jobs-company" className="sr-only">
          {t("filterCompany")}
        </label>
        <Input
          id="admin-jobs-company"
          name="company"
          defaultValue={raw.company ?? ""}
          placeholder={t("filterCompany")}
          className="sm:max-w-xs"
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
        <Table className="min-w-0" caption={t("jobsTitle")}>
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
                    href={`/jobs/${job.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {job.title}
                  </Link>
                  <Link
                    href={`/admin/companies/${job.companyId}`}
                    className="t-caption block text-fg-muted underline-offset-4 hover:underline"
                  >
                    {job.companyName}
                  </Link>
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
            query: { ...filters, cursor: nextCursor },
          }}
        />
      )}
    </AdminShell>
  );
}
