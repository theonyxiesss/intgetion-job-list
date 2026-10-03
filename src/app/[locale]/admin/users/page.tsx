import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserStatusAction } from "@/components/admin/admin-actions";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { Link } from "@/i18n/navigation";
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
    <AdminShell title={t("usersTitle")}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th scope="col">{t("colId")}</th>
            <th scope="col">{t("colRole")}</th>
            <th scope="col">{t("colStatus")}</th>
            <th scope="col">{t("colCreated")}</th>
            <th scope="col">{t("colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id} className="border-t border-current/15">
              <td className="py-2 font-mono text-xs">{user.id}</td>
              <td>{user.platformRole}</td>
              <td>{user.status}</td>
              <td>{user.createdAt.slice(0, 10)}</td>
              <td>
                {user.id !== admin.id && user.platformRole !== "admin" && (
                  <UserStatusAction userId={user.id} status={user.status} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextCursor && (
        <Link
          href={{ pathname: "/admin/users", query: { cursor: nextCursor } }}
          className="underline"
        >
          {t("nextPage")}
        </Link>
      )}
    </AdminShell>
  );
}
