import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FREELANCE_TIERS } from "@/config/freelance";
import { Container, PageHeader } from "@/components/ui/container";
import { HttpError } from "@/lib/http";
import { getOwnService, minorToUsd } from "@/modules/freelance/service";
import { listActiveSkills } from "@/modules/taxonomy/service";
import {
  ServiceForm,
  type ServiceDraft,
} from "@/modules/freelance/ui/service-form";
import {
  freelanceClientCopy,
  userOrLogin,
} from "@/modules/freelance/ui/server-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelance.cabinet" });
  return { title: t("editTitle"), robots: { index: false } };
}

/** Edit an own service; a live one goes back to moderation (D447). */
export default async function EditFreelanceServicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  let service;
  try {
    service = await getOwnService(user.id, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  const skills = new Map(
    (await listActiveSkills()).map((skill) => [
      skill.slug,
      locale === "ru" ? skill.nameRu : skill.nameEn,
    ]),
  );
  const packages = Object.fromEntries(
    FREELANCE_TIERS.map((tier) => {
      const pkg = service.packages.find((item) => item.tier === tier);
      return [
        tier,
        pkg
          ? {
              on: true,
              price: minorToUsd(pkg.priceMinor),
              days: String(pkg.deliveryDays),
              revisions: String(pkg.revisions),
              includes: pkg.includes.join("\n"),
            }
          : { on: false, price: "", days: "", revisions: "1", includes: "" },
      ];
    }),
  ) as ServiceDraft["packages"];
  const initial: ServiceDraft = {
    title: service.title,
    category: service.category,
    description: service.description,
    buyerNeeds: service.buyerNeeds,
    languages: service.languages.join(", "),
    skills: service.skillSlugs
      .map((slug) => skills.get(slug) ?? slug)
      .join(", "),
    links: service.links.join("\n"),
    packages,
  };
  const t = await getTranslations("freelance.cabinet");
  const copy = await freelanceClientCopy(locale);
  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader
          title={t("editTitle")}
          intro={
            service.status === "published" || service.status === "paused"
              ? t("editLiveNote")
              : t("formIntro")
          }
        />
        <ServiceForm copy={copy} initial={initial} serviceId={service.id} />
      </Container>
    </main>
  );
}
