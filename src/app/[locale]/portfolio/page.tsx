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
    title: t("portfolio"),
    robots: { index: false, follow: false },
  };
}

/** The portfolio, opened from the footer (D388). */
export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("footer");
  return (
    <EmbeddedSite title={t("portfolio")} src={EMBEDDED_SITES.portfolio} />
  );
}
