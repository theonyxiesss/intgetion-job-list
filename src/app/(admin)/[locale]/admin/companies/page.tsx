import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import { Button, Input, StatusBadge, Table, Td, Th, Tr } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { listCompanies, listCompaniesQuery } from "@/modules/admin/service";

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
  const query = listCompaniesQuery.safeParse(
    Object.fromEntries(Object.entries(raw).filter((entry) => entry[1])),
  );
  const { items, nextCursor } = await listCompanies(
    query.success ? query.data : listCompaniesQuery.parse({}),
  );

  return (
    <AdminShell title={t("companiesTitle")} active="companies">
      <form className="flex max-w-xl gap-2">
        <label htmlFor="company-q" className="sr-only">
          {t("peopleSearch")}
        </label>
        <Input
          id="company-q"
          name="q"
          defaultValue={raw.q ?? ""}
          placeholder={t("peopleSearch")}
        />
        <Button type="submit" variant="secondary">
          {t("search")}
        </Button>
      </form>
      <Table caption={t("companiesTitle")}>
        <thead>
          <tr>
            <Th>{t("colName")}</Th>
            <Th>{t("colStatus")}</Th>
            <Th>{t("colCreated")}</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((company) => (
            <Tr key={company.id}>
              <Td>
                <Link
                  href={`/admin/companies/${company.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {company.name}
                </Link>
              </Td>
              <Td>
                <StatusBadge status={company.status}>
                  {company.status}
                </StatusBadge>
              </Td>
              <Td mono>{company.createdAt.slice(0, 10)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {nextCursor && (
        <NextPageLink
          href={{
            pathname: "/admin/companies",
            query: {
              ...(raw.q ? { q: raw.q } : {}),
              cursor: nextCursor,
            },
          }}
        />
      )}
    </AdminShell>
  );
}
