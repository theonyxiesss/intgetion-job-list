import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { countPendingSkillSuggestions } from "@/modules/admin/service";
import { countPendingQueue } from "@/modules/moderation/service";

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const [suggestions, queue] = await Promise.all([
    countPendingSkillSuggestions(),
    countPendingQueue(),
  ]);

  return (
    <AdminShell title={t("title")}>
      <p>{t("pendingQueue", { count: queue })}</p>
      <p>{t("pendingSuggestions", { count: suggestions })}</p>
      <p className="text-sm opacity-80">{t("laterNote")}</p>
    </AdminShell>
  );
}
