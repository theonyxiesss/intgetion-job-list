import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { redirect } from "@/i18n/navigation";
import { getSeller, readServiceBriefDraft } from "@/modules/freelance/service";
import { EMPTY_DRAFT, ServiceForm } from "@/modules/freelance/ui/service-form";
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
  return { title: t("newTitle"), robots: { index: false } };
}

/** A new service starts as a draft (28.3). */
export default async function NewFreelanceServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const user = await userOrLogin(locale);
  if (!(await getSeller(user.id))) {
    redirect({ href: "/profile/freelance", locale });
  }
  const t = await getTranslations("freelance.cabinet");
  const copy = await freelanceClientCopy(locale);
  const sharedDraft = await readServiceBriefDraft(user.id, query.draft);
  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("newTitle")} intro={t("formIntro")} />
        <ButtonLink href="/chat?from=freelance_sell" variant="secondary">
          {copy.assistantDraft}
        </ButtonLink>
        <ServiceForm
          copy={copy}
          initial={EMPTY_DRAFT}
          sharedDraft={sharedDraft}
        />
      </Container>
    </main>
  );
}
