import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { countPendingSkillSuggestions } from "@/modules/admin/service";

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const pending = await countPendingSkillSuggestions();

  return (
    <AdminShell title={t("title")}>
      <p>{t("pendingSuggestions", { count: pending })}</p>
      <p className="text-sm opacity-80">{t("laterNote")}</p>
    </AdminShell>
  );
}
