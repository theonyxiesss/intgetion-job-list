import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import {
  Button,
  Input,
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { listPeople, peopleQuery } from "@/modules/admin-console/service";

export default async function AdminUsersPage({
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
  const query = peopleQuery.safeParse(
    Object.fromEntries(Object.entries(raw).filter((entry) => entry[1])),
  );
  const { items, nextCursor } = await listPeople(
    query.success ? query.data : peopleQuery.parse({}),
  );

  return (
    <AdminShell title={t("usersTitle")} active="users">
      <form className="flex max-w-xl flex-wrap gap-2">
        <label htmlFor="people-q" className="sr-only">
          {t("peopleSearch")}
        </label>
        <Input
          id="people-q"
          name="q"
          defaultValue={raw.q ?? ""}
          placeholder={t("peopleSearch")}
        />
        <Select
          name="status"
          defaultValue={raw.status ?? ""}
          aria-label={t("filterStatus")}
        >
          <option value="">{t("filterAll")}</option>
          <option value="active">{t("statusActive")}</option>
          <option value="suspended">{t("statusSuspended")}</option>
          <option value="banned">{t("statusBanned")}</option>
          <option value="deleted">{t("statusDeleted")}</option>
        </Select>
        <Select
          name="role"
          defaultValue={raw.role ?? ""}
          aria-label={t("filterRole")}
        >
          <option value="">{t("filterAll")}</option>
          <option value="candidate">{t("roleCandidate")}</option>
          <option value="employer">{t("roleEmployer")}</option>
          <option value="both">{t("roleBoth")}</option>
        </Select>
        <Button type="submit" variant="secondary">
          {t("search")}
        </Button>
      </form>
      <Table caption={t("usersTitle")}>
        <thead>
          <tr>
            <Th>{t("colName")}</Th>
            <Th>{t("colRole")}</Th>
            <Th>{t("colStatus")}</Th>
            <Th>{t("colEmail")}</Th>
            <Th>{t("colCreated")}</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <Tr key={user.id}>
              <Td>
                <Link
                  href={`/admin/users/${user.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {user.name ?? user.id.slice(0, 8)}
                </Link>
              </Td>
              <Td>{user.role}</Td>
              <Td>
                <StatusBadge status={user.status}>{user.status}</StatusBadge>
              </Td>
              <Td>{user.email ?? "—"}</Td>
              <Td mono>{user.createdAt.slice(0, 10)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {nextCursor && (
        <NextPageLink
          href={{
            pathname: "/admin/users",
            query: {
              ...(raw.q ? { q: raw.q } : {}),
              ...(raw.status ? { status: raw.status } : {}),
              ...(raw.role ? { role: raw.role } : {}),
              cursor: nextCursor,
            },
          }}
        />
      )}
    </AdminShell>
  );
}
