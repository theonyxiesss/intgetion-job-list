import type { Metadata } from "next";
import { Search } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { HeroWordmark } from "@/components/home/hero-wordmark";
import {
  LandingCta,
  LandingFeatures,
  LandingPricing,
} from "@/components/home/landing";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { navForward } from "@/components/ui/page-transition";
import { listPromotedJobs, searchJobs } from "@/modules/jobs/service";
import { PublicJobCard } from "@/modules/jobs/ui/public-job-card";
import { JsonLd } from "@/modules/seo/json-ld";
import { faqPageJsonLd, homeGraphJsonLd } from "@/modules/seo/markup";
import { languageAlternates, siteUrl } from "@/modules/seo/site";
import { localePrefix } from "@/i18n/paths";

/**
 * The home page is the job feed (D332): top jobs, then the long feed. Since
 * D428 a hero sits above it and the features and pricing sit between the top
 * jobs and the rest.
 */
const FEED_SIZE = 50;
const TOP_SIZE = 3;
const FAQ = ["what", "free", "apply", "post", "contacts"] as const;

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

async function JobFeed({
  locale,
  between,
}: {
  locale: string;
  between: ReactNode;
}) {
  const t = await getTranslations("home");
  const jobsT = await getTranslations("jobs");
  const promoted = await listPromotedJobs(locale);
  const promotedIds = new Set(promoted.map((job) => job.id));
  const result = await searchJobs(
    { limit: FEED_SIZE, minOverlap: 3, sort: "newest" },
    locale,
  );
  if (result.items.length === 0 && promoted.length === 0) {
    return (
      <>
        <Container>
          <EmptyState title={t("latestEmpty")} />
        </Container>
        {between}
      </>
    );
  }
  const feed = result.items.filter((job) => !promotedIds.has(job.id));
  const top = pickTop(feed);
  const topIds = new Set(top.map((job) => job.id));
  const rest = feed.filter((job) => !topIds.has(job.id));
  return (
    <>
      {promoted.length > 0 ? (
        <section aria-labelledby="promoted-jobs" className="pt-8 pb-2 md:pt-10">
          <Container className="flex flex-col gap-6">
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
          </Container>
        </section>
      ) : null}
      {top.length > 0 ? (
        <section
          aria-labelledby="top-jobs"
          className="pt-8 pb-6 md:pt-10 md:pb-8"
        >
          <Container className="flex flex-col gap-6">
            <h2 id="top-jobs" className="t-h2">
              {t("topJobs")}
            </h2>
            <ul className="grid gap-4">
              {top.map((job) => (
                <li key={job.id}>
                  <PublicJobCard job={job} locale={locale} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
      {between}
      {rest.length > 0 ? (
        <section
          aria-labelledby="all-jobs"
          className="pt-6 pb-12 md:pt-8 md:pb-16"
        >
          <Container className="flex flex-col gap-6">
            <h2 id="all-jobs" className="t-h2">
              {t("allJobs")}
            </h2>
            <ul className="grid gap-4">
              {rest.map((job) => (
                <li key={job.id}>
                  <PublicJobCard job={job} locale={locale} />
                </li>
              ))}
            </ul>
            <Link
              href={
                result.nextCursor
                  ? `/jobs?cursor=${encodeURIComponent(result.nextCursor)}`
                  : "/jobs"
              }
              {...navForward}
              className={buttonClass("secondary", "md", "self-start")}
            >
              {t("moreJobs")}
            </Link>
          </Container>
        </section>
      ) : null}
    </>
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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const product = await getTranslations("product");
  const nav = await getTranslations("nav");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

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
            className="t-display-xl relative -mt-[0.25em] max-w-[16ch]"
          >
            {t("landing.heroTitle")}
          </h1>
          <p className="t-body-l mt-6 max-w-[42ch] text-fg-muted md:text-[21px]">
            {t("landing.heroLead")}
          </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/jobs" size="lg">
              {t("landing.findJobs")}
            </ButtonLink>
            <ButtonLink href="/post-job" size="lg" variant="secondary">
              {nav("postJob")}
            </ButtonLink>
          </div>
          <form
            id="search"
            action={`${localePrefix(locale)}/jobs`}
            method="get"
            className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-lg border border-line-strong bg-surface py-1 pr-1 pl-4 has-[#q:focus-visible]:outline-2 has-[#q:focus-visible]:outline-offset-2 has-[#q:focus-visible]:outline-accent"
          >
            <span aria-hidden="true" className="text-fg-subtle">
              <Icon icon={Search} size={16} />
            </span>
            <label className="sr-only" htmlFor="q">
              {t("searchLabel")}
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={query}
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 border-0! bg-transparent! px-1! font-mono text-[14px] focus-visible:outline-none"
            />
            <Button
              type="submit"
              variant="secondary"
              className="min-h-10! px-4! text-[14px]!"
            >
              {t("searchSubmit")}
            </Button>
          </form>
        </Container>
      </section>

      <Suspense fallback={null}>
        <JobFeed
          locale={locale}
          between={
            <>
              <LandingFeatures />
              <LandingPricing />
            </>
          }
        />
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
