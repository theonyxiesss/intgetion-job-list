import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { Container } from "@/components/ui";
import { LEGAL_DETAILS } from "@/config/legal";
import { legalText } from "@/content/legal";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("termsTitle"),
    alternates: {
      canonical: `${siteUrl()}/${locale}/terms`,
      languages: languageAlternates("/terms"),
    },
  };
}

/** Terms of Use (D241). */
export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <main className="py-10 md:py-16">
      <Container>
        <LegalDocument
          markdown={legalText("terms", locale)}
          values={LEGAL_DETAILS}
          missing={t("toBeSpecified")}
        />
      </Container>
    </main>
  );
}
