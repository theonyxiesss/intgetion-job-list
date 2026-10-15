import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Tag } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { navBack } from "@/components/ui/page-transition";
import { Stat, StatRow } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import { localePrefix } from "@/i18n/paths";
import { publicHttpUrl } from "@/lib/company-mark";
import { requireUser } from "@/lib/auth-guards";
import {
  companiesToOrderFrom,
  getServicePage,
  minorToUsd,
  type ServicePage,
} from "@/modules/freelance/service";
import { RequestForm } from "@/modules/freelance/ui/request-form";
import { freelanceClientCopy } from "@/modules/freelance/ui/server-copy";
import {
  formatUsd,
  languageNames,
  utcLabel,
} from "@/modules/freelance/ui/format";
import { TrackRecord } from "@/modules/freelance/ui/service-card";
import { JsonLd } from "@/modules/seo/json-ld";
import { breadcrumbListJsonLd } from "@/modules/seo/markup";
import {
  languageAlternates,
  metaDescription,
  siteUrl,
} from "@/modules/seo/site";

export const dynamic = "force-dynamic";

/** Service markup: what it is and its price range in USD (28.3). */
function serviceJsonLd(page: ServicePage, url: string) {
  const prices = page.packages.map((pkg) => pkg.priceMinor);
  const low = prices.reduce((a, b) => (b < a ? b : a));
  const high = prices.reduce((a, b) => (b > a ? b : a));
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.title,
    description: metaDescription(page.description, 300),
    url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: minorToUsd(low),
      highPrice: minorToUsd(high),
      offerCount: page.packages.length,
    },
  };
}

/** Service title, description and canonical for search (D446). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getServicePage(slug, locale);
  if (!page) return {};
  const description = metaDescription(page.description);
  return {
    title: page.title,
    description,
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/freelance/${page.slug}`,
      languages: languageAlternates(`/freelance/${page.slug}`),
    },
    openGraph: { type: "website", title: page.title, description },
  };
}

export default async function FreelanceServicePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getServicePage(slug, locale);
  if (!page) notFound();
  const t = await getTranslations("freelance");
  // A guest still reads the page; only the request needs a session.
  const viewer = await requireUser().catch(() => null);
  const seo = await getTranslations("seo");
  const nav = await getTranslations("nav");
  const pageUrl = `${siteUrl()}${localePrefix(locale)}/freelance/${page.slug}`;
  const links = page.links.flatMap((link) => {
    const href = publicHttpUrl(link);
    return href ? [{ href, host: new URL(href).host }] : [];
  });
  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
  });
  const sellerName =
    page.seller.displayName ?? page.seller.headline ?? t("seller");

  return (
    <main className="py-10 md:py-16">
      <JsonLd data={serviceJsonLd(page, pageUrl)} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: seo("home"), url: `${siteUrl()}${localePrefix(locale)}` },
          {
            name: nav("freelance"),
            url: `${siteUrl()}${localePrefix(locale)}/freelance`,
          },
          { name: page.title, url: pageUrl },
        ])}
      />
      <Container className="flex flex-col gap-8">
        <Link
          href="/freelance"
          {...navBack}
          className="t-label inline-flex min-h-11 items-center self-start text-fg-muted"
        >
          {t("back")}
        </Link>
        <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <article className="flex min-w-0 flex-col gap-8">
            <header className="flex flex-col gap-4">
              <p className="t-label text-fg-muted">
                {t(`categories.${page.category}`)}
              </p>
              <h1 className="t-display-l">{page.title}</h1>
              <div className="flex flex-col gap-1">
                <p className="t-body-l">{sellerName}</p>
                {page.seller.displayName && page.seller.headline ? (
                  <p className="t-body-s text-fg-muted">
                    {page.seller.headline}
                  </p>
                ) : null}
              </div>
            </header>
            <StatRow>
              <Stat
                label={t("priceLabel")}
                value={t("from", { price: formatUsd(page.fromMinor, locale) })}
              />
              <Stat
                label={t("termLabel")}
                value={t("days", { count: page.fromDays })}
              />
              <Stat
                label={t("zoneLabel")}
                value={utcLabel(page.seller.timezone)}
              />
              <Stat
                label={t("languagesLabel")}
                value={languageNames(page.languages, locale)}
              />
            </StatRow>
            {page.skills.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="t-label text-fg-muted">{t("skills")}</h2>
                <ul className="flex flex-wrap gap-2">
                  {page.skills.map((skill) => (
                    <li key={skill}>
                      <Tag>{skill}</Tag>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="flex flex-col gap-3">
              <h2 className="t-h3">{t("aboutTitle")}</h2>
              <p className="t-body-l max-w-[68ch] whitespace-pre-wrap">
                {page.description}
              </p>
            </section>
            {page.buyerNeeds ? (
              <section className="flex flex-col gap-3">
                <h2 className="t-h3">{t("needsTitle")}</h2>
                <p className="max-w-[68ch] whitespace-pre-wrap text-fg-muted">
                  {page.buyerNeeds}
                </p>
              </section>
            ) : null}
            {links.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="t-h3">{t("worksTitle")}</h2>
                <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                  {links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        rel="noopener noreferrer nofollow ugc"
                        className="t-data flex min-h-11 items-center px-4 underline-offset-4 hover:underline"
                      >
                        {link.host}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="t-h3">{t("reviewsTitle")}</h2>
                <TrackRecord card={page} />
              </div>
              <p className="t-body-s text-fg-muted">{t("reviewsNote")}</p>
              {page.reviews.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {page.reviews.map((review, index) => (
                    <li
                      key={`${review.createdAt.toISOString()}-${index}`}
                      className="flex flex-col gap-1 border-t border-line pt-4"
                    >
                      <p className="t-label text-fg-muted">
                        {t(`authorKinds.${review.authorKind}`)} ·{" "}
                        <time dateTime={review.createdAt.toISOString()}>
                          {dateFormat.format(review.createdAt)}
                        </time>
                      </p>
                      <p className="t-data">
                        {t("stars", { rating: review.rating })}
                      </p>
                      {review.body ? (
                        <p className="max-w-[68ch]">{review.body}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-fg-muted">{t("noReviews")}</p>
              )}
            </section>
          </article>
          <aside
            className="flex flex-col gap-4 lg:sticky lg:top-24"
            aria-label={t("packagesTitle")}
          >
            <h2 className="t-label text-fg-muted">{t("packagesTitle")}</h2>
            <ul className="flex flex-col gap-3">
              {page.packages.map((pkg) => (
                <li
                  key={pkg.tier}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="t-h3">{t(`tiers.${pkg.tier}`)}</h3>
                    <p className="t-data-l">
                      {formatUsd(pkg.priceMinor, locale)}
                    </p>
                  </div>
                  <p className="t-data text-fg-muted">
                    {t("days", { count: pkg.deliveryDays })} ·{" "}
                    {t("revisions", { count: pkg.revisions })}
                  </p>
                  <ul className="t-body-s flex flex-col gap-1">
                    {pkg.includes.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden="true" className="text-success">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 rounded-lg border border-line-strong p-4">
              {!viewer ? (
                <>
                  <p className="t-body-s">{t("requestSignIn")}</p>
                  <Link href="/login" className={buttonClass("primary")}>
                    {t("signIn")}
                  </Link>
                </>
              ) : viewer.id === page.seller.userId ? (
                <p className="t-body-s">{t("ownService")}</p>
              ) : (
                <RequestForm
                  serviceId={page.id}
                  tiers={page.packages.map((pkg) => ({
                    tier: pkg.tier,
                    label: `${t(`tiers.${pkg.tier}`)} · ${formatUsd(pkg.priceMinor, locale)}`,
                  }))}
                  companies={await companiesToOrderFrom(viewer.id)}
                  copy={await freelanceClientCopy(locale)}
                />
              )}
              <p className="t-body-s text-fg-muted">{t("contactsNote")}</p>
              <p className="t-body-s text-fg-muted">{t("payNote")}</p>
            </div>
            <Link href="/services" className={buttonClass("secondary")}>
              {t("teamLink")}
            </Link>
          </aside>
        </div>
      </Container>
    </main>
  );
}
