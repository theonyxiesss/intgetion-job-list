import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { CountUp, Icon, navForward } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { countPendingSkillSuggestions } from "@/modules/admin/service";
import {
  countOpenReports,
  countPendingQueue,
} from "@/modules/moderation/service";

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const [suggestions, queue, reports] = await Promise.all([
    countPendingSkillSuggestions(),
    countPendingQueue(),
    countOpenReports(),
  ]);
  const tiles = [
    { label: t("statQueue"), value: queue, href: "/admin/moderation" },
    { label: t("statReports"), value: reports, href: "/admin/reports" },
    {
      label: t("statSuggestions"),
      value: suggestions,
      href: "/admin/taxonomy",
    },
  ];

  return (
    <AdminShell title={t("overviewTitle")} active="home" intro={t("laterNote")}>
      <ul className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.href} className="bg-bg">
            <Link
              {...navForward}
              href={tile.href}
              className="group flex h-full flex-col gap-6 p-6 transition-colors duration-[120ms] hover:bg-surface-2"
            >
              <span className="t-label text-fg-muted">{tile.label}</span>
              <span
                className={
                  tile.value > 0
                    ? "t-data-l text-fg"
                    : "t-data-l text-fg-subtle"
                }
              >
                <CountUp value={tile.value} locale={locale} />
              </span>
              <span className="t-nav inline-flex items-center gap-2 text-fg-muted group-hover:text-fg">
                {t("open")}
                <span className="transition-transform duration-[120ms] group-hover:translate-x-1">
                  <Icon icon={ArrowRight} size={16} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
