import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";

export default async function AdminTeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  return (
    <AdminShell title={t("teamTitle")} active="team" intro={t("teamIntro")}>
      <p className="text-fg-muted">{t("teamIntro")}</p>
    </AdminShell>
  );
}
