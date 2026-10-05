import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button, buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { CountUp, Reveal } from "@/components/ui/motion";
import { OrbitBackdrop } from "@/components/ui/orbit-backdrop";
import { navForward } from "@/components/ui/page-transition";
import { countPublicCatalog } from "@/modules/jobs/service";
import { LatestJobs } from "@/modules/jobs/ui/latest-jobs";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

const categoryIds = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "support",
  "operations",
  "finance",
  "hr",
] as const;

const steps = ["benefitBot", "benefitMatch", "benefitContacts"] as const;

/** Catalog counts sit under the hero so the LCP line is not held for the database (D260). */
async function HomeStats({ locale }: { locale: string }) {
  const catalog = await countPublicCatalog();
  if (catalog.jobs <= 0) return null;
  const t = await getTranslations("home");
  return (
    <Section bordered>
      <Container>
        <dl className="grid grid-cols-2 gap-8">
          <div className="flex flex-col gap-2">
            <dt className="t-label text-fg-muted">{t("statJobs")}</dt>
            <dd className="t-data-l">
              <CountUp value={catalog.jobs} locale={locale} />
            </dd>
          </div>
          <div className="flex flex-col gap-2">
            <dt className="t-label text-fg-muted">{t("statCompanies")}</dt>
            <dd className="t-data-l">
              <CountUp value={catalog.companies} locale={locale} />
            </dd>
          </div>
        </dl>
      </Container>
    </Section>
  );
}

async function LatestSection({ locale }: { locale: string }) {
  const t = await getTranslations("home");
  return (
    <Section>
      <Container className="flex flex-col gap-8">
        <h2 id="latest" className="t-h2">
          {t("latestTitle")}
        </h2>
        <LatestJobs locale={locale} />
      </Container>
    </Section>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** The home page carries the words people search for (D277). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const product = await getTranslations({ locale, namespace: "product" });
  const title = `${t("homeTitle")} — ${product("wordmark")}`;
  return {
    // Absolute: the layout template would append the product name again.
    title: { absolute: title },
    description: t("homeDescription"),
    alternates: {
      canonical: `${siteUrl()}/${locale}`,
      languages: languageAlternates(""),
    },
    openGraph: {
      type: "website",
      title,
      description: t("homeDescription"),
    },
  };
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const categories = await getTranslations("categories");
  const product = await getTranslations("product");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return (
    <main>
      <section className="relative overflow-hidden border-b border-line">
        <OrbitBackdrop />
        <Container className="relative flex min-h-[70vh] flex-col justify-end gap-8 py-16 md:py-24">
          <p className="t-label text-fg-muted">{product("name")}</p>
          <h1 className="t-display-xl max-w-[16ch]">
            {t("line1")} <br />
            {t("line2")}
          </h1>
          <p className="max-w-[52ch] text-fg-muted">{t("subtitle")}</p>
          <form
            id="search"
            action={`/${locale}/jobs`}
            method="get"
            className="flex max-w-3xl flex-col gap-3 sm:flex-row"
          >
            <label className="sr-only" htmlFor="q">
              {t("searchLabel")}
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={query}
              placeholder={t("searchPlaceholder")}
              className="flex-1"
            />
            <Button type="submit" size="lg">
              {t("searchSubmit")}
            </Button>
          </form>
          <ul className="flex flex-wrap gap-2">
            {categoryIds.map((id) => (
              <li key={id}>
                <Link
                  id={`category-${id}`}
                  href={`/jobs?category=${id}`}
                  {...navForward}
                  className={buttonClass("secondary")}
                >
                  {categories(id)}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Suspense fallback={null}>
        <HomeStats locale={locale} />
      </Suspense>

      <Suspense fallback={null}>
        <LatestSection locale={locale} />
      </Suspense>

      <Section bordered>
        <Container className="flex flex-col gap-10">
          <h2 className="t-h2">{t("benefitsTitle")}</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal as="li" index={index} key={step}>
                <p className="t-data text-fg-muted">0{index + 1}</p>
                <h3 className="t-h3 mt-3">{t(`${step}Title`)}</h3>
                <p className="mt-2 text-fg-muted">{t(`${step}Body`)}</p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>

      <section id="post" className="py-16 md:py-24">
        <Container className="flex flex-col gap-4 border border-line p-6 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="flex flex-col gap-2">
            <h2 className="t-h2">{t("postJob")}</h2>
            <p className="text-fg-muted">{t("postNote")}</p>
          </div>
          <Link
            href="/register"
            {...navForward}
            className={buttonClass("primary", "lg")}
          >
            {t("postJob")}
          </Link>
        </Container>
      </section>
    </main>
  );
}
