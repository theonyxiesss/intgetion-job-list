import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { HeroWordmark } from "@/components/home/hero-wordmark";
import { HomeAsk } from "@/components/home/home-ask";
import { LandingPlatform, LandingServices } from "@/components/home/platform";
import { LandingCta } from "@/components/home/landing";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { navForward } from "@/components/ui/page-transition";
import { listPromotedJobs, searchJobs } from "@/modules/jobs/service";
import { PublicJobCard } from "@/modules/jobs/ui/public-job-card";
import { JsonLd } from "@/modules/seo/json-ld";
import { faqPageJsonLd, homeGraphJsonLd } from "@/modules/seo/markup";
import { languageAlternates, siteUrl } from "@/modules/seo/site";
import { localePrefix } from "@/i18n/paths";

/**
 * The home page presents the platform for remote work (D601, replacing the
 * job feed of D332): the hero hands a task to Spoki, then a tile for each
 * service, how it works, a few top jobs and the questions.
 */
const FEED_SIZE = 50;
const TOP_SIZE = 3;
const FAQ = ["what", "free", "spoki", "pay", "contacts"] as const;
const EXAMPLES = ["work", "hire", "ugc", "task"] as const;

type FeedJob = Awaited<ReturnType<typeof searchJobs>>["items"][number];

/** Top: trusted companies with a stated salary first, then the newest. */
function pickTop(jobs: readonly FeedJob[]): FeedJob[] {
  const weight = (job: FeedJob) =>
    (job.company.isTrusted ? 2 : 0) + (job.salaryMin ? 1 : 0);
  return [...jobs]
    .map((job, index) => ({ job, index }))
    .sort((a, b) => weight(b.job) - weight(a.job) || a.index - b.index)
    .slice(0, TOP_SIZE)
    .map(({ job }) => job);
}

/** Promoted jobs and the top three, then the catalog (D601). */
async function JobFeed({ locale }: { locale: string }) {
  const t = await getTranslations("home");
  const jobsT = await getTranslations("jobs");
  const promoted = await listPromotedJobs(locale);
  const promotedIds = new Set(promoted.map((job) => job.id));
  const result = await searchJobs(
    { limit: FEED_SIZE, minOverlap: 3, sort: "newest" },
    locale,
  );
  const top = pickTop(result.items.filter((job) => !promotedIds.has(job.id)));
  if (top.length === 0 && promoted.length === 0) return null;
  return (
    <section
      aria-labelledby="top-jobs"
      className="border-t border-line py-16 md:py-24"
    >
      <Container className="flex flex-col gap-6">
        {promoted.length > 0 ? (
          <>
            <h2 id="promoted-jobs" className="t-h2">
              {jobsT("promotedHeading")}
            </h2>
            <ul className="grid gap-4">
              {promoted.map((job) => (
                <li key={job.id}>
                  <PublicJobCard job={job} locale={locale} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <h2 id="top-jobs" className="t-h2">
          {t("topJobs")}
        </h2>
        {top.length > 0 ? (
          <ul className="grid gap-4">
            {top.map((job) => (
              <li key={job.id}>
                <PublicJobCard job={job} locale={locale} />
              </li>
            ))}
          </ul>
        ) : null}
        <Link
          href="/jobs"
          {...navForward}
          className={buttonClass("secondary", "md", "self-start")}
        >
          {t("moreJobs")}
        </Link>
      </Container>
    </section>
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
      canonical: `${siteUrl()}${localePrefix(locale)}`,
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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const product = await getTranslations("product");

  return (
    <main>
      <JsonLd
        data={homeGraphJsonLd({
          name: product("name"),
          url: siteUrl(),
          logoUrl: `${siteUrl()}/icons/icon-512.png`,
          locale,
        })}
      />
      <JsonLd
        data={faqPageJsonLd(
          FAQ.map((key) => ({
            question: t(`faq.${key}.q`),
            answer: t(`faq.${key}.a`),
          })),
        )}
      />
      <section
        aria-labelledby="home-title"
        className="pt-10 pb-12 md:pt-16 md:pb-20"
      >
        <Container className="flex flex-col items-center text-center">
          <HeroWordmark name={product("wordmark")} />
          <h1
            id="home-title"
            className="t-display-xl relative -mt-[0.25em] max-w-[18ch]"
          >
            {t("landing.heroTitle")}
          </h1>
          <p className="t-body-l mt-6 max-w-[42ch] text-fg-muted md:text-[21px]">
            {t("landing.heroLead")}
          </p>
          <HomeAsk
            action={`${localePrefix(locale)}/chat`}
            label={t("landing.ask.label")}
            placeholder={t("landing.ask.placeholder")}
            submit={t("landing.ask.submit")}
            examplesLabel={t("landing.ask.examplesLabel")}
            examples={EXAMPLES.map((key) => t(`landing.ask.examples.${key}`))}
          />
        </Container>
      </section>

      <LandingServices />
      <LandingPlatform />

      <Suspense fallback={null}>
        <JobFeed locale={locale} />
      </Suspense>

      <section
        id="faq"
        aria-labelledby="home-faq"
        className="scroll-mt-24 border-t border-line py-16 md:py-24"
      >
        <Container narrow className="flex flex-col gap-6">
          <h2 id="home-faq" className="t-display-l">
            {t("faqTitle")}
          </h2>
          <div className="flex flex-col border-t border-line">
            {FAQ.map((key) => (
              <details key={key} className="group border-b border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                  <span className="break-words">{t(`faq.${key}.q`)}</span>
                  <span
                    aria-hidden="true"
                    className="t-data text-fg-muted transition-transform duration-[120ms] group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-[65ch] pb-4 text-fg-muted">
                  {t(`faq.${key}.a`)}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>
      <LandingCta />
    </main>
  );
}
