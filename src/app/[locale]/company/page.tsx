import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmbeddedSite } from "@/components/shell/embedded-site";
import { EMBEDDED_SITES } from "@/lib/embedded-sites";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "footer" });
  return {
    title: t("companySite"),
    robots: { index: false, follow: false },
  };
}

/** The company site, opened from the footer (D388). */
export default async function CompanySitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("footer");
  return (
    <EmbeddedSite title={t("companySite")} src={EMBEDDED_SITES.company} />
  );
}
