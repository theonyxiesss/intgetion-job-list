import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { requireAdminPermission } from "@/admin/action";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { HttpError } from "@/lib/http";
import { getServiceForReview } from "@/modules/freelance/service";
import { formatUsd } from "@/modules/freelance/ui/format";

/** A freelance service as the moderator reads it before deciding (28.9). */
export default async function AdminFreelanceServicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!z.uuid().safeParse(id).success) notFound();
  await requireAdminPage();
  try {
    await requireAdminPermission("moderation.decide");
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const t = await getTranslations("admin.freelance");
  const service = await getServiceForReview(id);
  if (!service) notFound();

  return (
    <AdminShell title={service.title} active="moderation">
      <p className="t-body-s text-fg-muted">
        <StatusBadge status={service.status}>{service.status}</StatusBadge>
        {" · "}
        {service.category}
        {" · "}
        {service.languages.join(", ")}
        {" · "}
        <span className="font-mono">{service.skillSlugs.join(", ")}</span>
      </p>
      <p>
        <Link
          href={{
            pathname: "/admin/moderation",
            query: { entityType: "freelance_service" },
          }}
          className="underline-offset-4 hover:underline"
        >
          {t("back")}
        </Link>
      </p>
      <section className="flex flex-col gap-2">
        <h2 className="t-h3">{t("description")}</h2>
        <p className="max-w-[68ch] whitespace-pre-wrap">
          {service.description}
        </p>
      </section>
      {service.buyerNeeds ? (
        <section className="flex flex-col gap-2">
          <h2 className="t-h3">{t("needs")}</h2>
          <p className="max-w-[68ch] whitespace-pre-wrap">
            {service.buyerNeeds}
          </p>
        </section>
      ) : null}
      <section className="flex flex-col gap-2">
        <h2 className="t-h3">{t("packages")}</h2>
        <ul className="flex flex-col gap-3">
          {service.packages.map((pkg) => (
            <li key={pkg.tier} className="rounded-lg border border-line p-4">
              <p className="t-data">
                {pkg.tier} · {formatUsd(pkg.priceMinor, locale)} ·{" "}
                {t("terms", {
                  days: pkg.deliveryDays,
                  revisions: pkg.revisions,
                })}
              </p>
              <ul className="t-body-s mt-2 list-disc pl-5">
                {pkg.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
      {service.links.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="t-h3">{t("links")}</h2>
          <ul className="t-data flex flex-col gap-1">
            {service.links.map((link) => (
              <li key={link} className="break-all">
                {link}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {service.moderationNote ? (
        <p className="t-body-s text-fg-muted">
          {t("note")}: {service.moderationNote}
        </p>
      ) : null}
    </AdminShell>
  );
}
