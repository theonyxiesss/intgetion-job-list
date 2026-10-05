import { Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { UserStatusAction } from "@/components/admin/admin-actions";
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
import { listUsers, listUsersQuery } from "@/modules/admin/service";

const statuses = ["active", "suspended", "deleted"] as const;
const roles = ["user", "admin"] as const;

function filled(raw: Record<string, string | undefined>) {
  const entries = Object.entries(raw).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );
  const query = Object.fromEntries(entries);
  if (query.id && !z.uuid().safeParse(query.id).success) delete query.id;
  return query;
}

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
  const raw = await searchParams;
  const query = listUsersQuery.safeParse(filled(raw));
  const { items, nextCursor } = await listUsers(
    query.success ? query.data : listUsersQuery.parse({}),
  );
  const filters = {
    ...(raw.id && z.uuid().safeParse(raw.id).success ? { id: raw.id } : {}),
    ...(raw.status ? { status: raw.status } : {}),
    ...(raw.role ? { role: raw.role } : {}),
  };

  return (
    <AdminShell title={t("usersTitle")} active="users">
      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        <label htmlFor="admin-users-id" className="sr-only">
          {t("searchUserId")}
        </label>
        <Input
          id="admin-users-id"
          name="id"
          defaultValue={raw.id ?? ""}
          placeholder={t("searchUserId")}
          className="sm:max-w-xs"
        />
        <label htmlFor="admin-users-role" className="sr-only">
          {t("colRole")}
        </label>
        <Select
          id="admin-users-role"
          name="role"
          defaultValue={raw.role ?? ""}
          className="sm:w-auto"
        >
          <option value="">{t("anyRole")}</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
        <label htmlFor="admin-users-status" className="sr-only">
          {t("colStatus")}
        </label>
        <Select
          id="admin-users-status"
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
        <EmptyState title={t("usersEmpty")} />
      ) : (
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
                <Td className="max-w-40 break-all">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-fg-muted underline-offset-4 hover:underline"
                  >
                    {user.id}
                  </Link>
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
      )}
      {nextCursor && (
        <NextPageLink
          href={{
            pathname: "/admin/users",
            query: { ...filters, cursor: nextCursor },
          }}
        />
      )}
    </AdminShell>
  );
}
