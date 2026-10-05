import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";

export default async function AdminFlagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  return (
    <AdminShell title={t("flagsTitle")} active="flags" intro={t("flagsIntro")}>
      <p className="text-fg-muted">{t("flagsIntro")}</p>
    </AdminShell>
  );
}
