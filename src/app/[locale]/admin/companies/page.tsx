import { Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import {
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
import {
  listCompaniesPanel,
  listCompaniesQuery,
} from "@/modules/admin/service";

const statuses = [
  "unverified",
  "pending_verification",
  "verified",
  "rejected",
  "suspended",
] as const;

function filled(raw: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
}

export default async function AdminCompaniesPage({
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
  const query = listCompaniesQuery.safeParse(filled(raw));
  const { items, nextCursor } = await listCompaniesPanel(
    query.success ? query.data : listCompaniesQuery.parse({}),
  );
  const filters = {
    ...(raw.q ? { q: raw.q } : {}),
    ...(raw.status ? { status: raw.status } : {}),
  };

  return (
    <AdminShell title={t("companiesTitle")} active="companies">
      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        <label htmlFor="admin-companies-q" className="sr-only">
          {t("searchCompany")}
        </label>
        <Input
          id="admin-companies-q"
          name="q"
          defaultValue={raw.q ?? ""}
          placeholder={t("searchCompany")}
          className="sm:max-w-xs"
        />
        <label htmlFor="admin-companies-status" className="sr-only">
          {t("colStatus")}
        </label>
        <Select
          id="admin-companies-status"
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
        <Button
          type="submit"
          variant="secondary"
          icon={<Icon icon={Search} size={16} />}
        >
          {t("search")}
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyState title={t("companiesEmpty")} />
      ) : (
        <Table className="min-w-0" caption={t("companiesTitle")}>
          <thead>
            <tr>
              <Th>{t("colName")}</Th>
              <Th>{t("colStatus")}</Th>
              <Th>{t("colTrusted")}</Th>
              <Th numeric>{t("colJobs")}</Th>
              <Th>{t("colCreated")}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((company) => (
              <Tr key={company.id}>
                <Td>
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {company.name}
                  </Link>
                  <span className="t-caption block break-all text-fg-muted">
                    {company.slug}
                  </span>
                </Td>
                <Td>
                  <StatusBadge status={company.status}>
                    {company.status}
                  </StatusBadge>
                </Td>
                <Td>{company.isTrusted ? t("trustedYes") : t("trustedNo")}</Td>
                <Td numeric>{company.jobCount}</Td>
                <Td mono>{company.createdAt.toISOString().slice(0, 10)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {nextCursor && (
        <NextPageLink
          href={{
            pathname: "/admin/companies",
            query: { ...filters, cursor: nextCursor },
          }}
        />
      )}
    </AdminShell>
  );
}
