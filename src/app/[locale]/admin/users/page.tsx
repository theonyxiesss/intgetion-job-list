import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserStatusAction } from "@/components/admin/admin-actions";
import {
  AdminShell,
  NextPageLink,
  requireAdminPage,
} from "@/components/admin/admin-page";
import { StatusBadge, Table, Td, Th, Tr } from "@/components/ui";
import { listUsers, listUsersQuery } from "@/modules/admin/service";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requireAdminPage();
  const t = await getTranslations("admin");
  const query = listUsersQuery.safeParse(await searchParams);
  const { items, nextCursor } = await listUsers(
    query.success ? query.data : listUsersQuery.parse({}),
  );

  return (
    <AdminShell title={t("usersTitle")} active="users">
      <Table caption={t("usersTitle")}>
        <thead>
          <tr>
            <Th>{t("colId")}</Th>
            <Th>{t("colRole")}</Th>
            <Th>{t("colStatus")}</Th>
            <Th>{t("colCreated")}</Th>
            <Th>{t("colActions")}</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <Tr key={user.id}>
              <Td mono className="text-fg-muted">
                {user.id}
              </Td>
              <Td>{user.platformRole}</Td>
              <Td>
                <StatusBadge status={user.status}>{user.status}</StatusBadge>
              </Td>
              <Td mono>{user.createdAt.slice(0, 10)}</Td>
              <Td>
                {user.id !== admin.id && user.platformRole !== "admin" && (
                  <UserStatusAction userId={user.id} status={user.status} />
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {nextCursor && (
        <NextPageLink
          href={{ pathname: "/admin/users", query: { cursor: nextCursor } }}
        />
      )}
    </AdminShell>
  );
}
