import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/admin/action";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { EmptyState, Table, Td, Th, Tr } from "@/components/ui";
import { HttpError } from "@/lib/http";
import {
  isMissingEngagementTable,
  listEngagementBriefs,
} from "@/modules/companies/service";

/** Problems left on /services (D413, D417). Contact details: people who may read user data. */
export default async function AdminEngagementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  try {
    await requireAdminPermission("users.pii.read");
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const t = await getTranslations("admin.engagements");
  let missing = false;
  let rows: Awaited<ReturnType<typeof listEngagementBriefs>> = [];
  try {
    rows = await listEngagementBriefs();
  } catch (error) {
    if (!isMissingEngagementTable(error)) throw error;
    missing = true;
  }

  return (
    <AdminShell title={t("title")} active="engagements" intro={t("intro")}>
      {missing ? (
        <EmptyState title={t("pending")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Table caption={t("title")}>
          <thead>
            <tr>
              <Th>{t("when")}</Th>
              <Th>{t("who")}</Th>
              <Th>{t("org")}</Th>
              <Th>{t("budget")}</Th>
              <Th>{t("duration")}</Th>
              <Th>{t("start")}</Th>
              <Th>{t("task")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>{row.createdAt.replace("T", " ").slice(0, 16)}</Td>
                <Td>{row.reply}</Td>
                <Td>{row.organization ?? "—"}</Td>
                <Td>{row.budget ?? "—"}</Td>
                <Td>{row.duration ?? "—"}</Td>
                <Td>{row.start ?? "—"}</Td>
                <Td>
                  <span className="whitespace-pre-wrap">{row.task}</span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </AdminShell>
  );
}
