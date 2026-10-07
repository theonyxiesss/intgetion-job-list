import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button, buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { navForward } from "@/components/ui/page-transition";
import { searchJobs } from "@/modules/jobs/service";
import { PublicJobCard } from "@/modules/jobs/ui/public-job-card";
import { JsonLd } from "@/modules/seo/json-ld";
import { faqPageJsonLd, homeGraphJsonLd } from "@/modules/seo/markup";
import { languageAlternates, siteUrl } from "@/modules/seo/site";
import { localePrefix } from "@/i18n/paths";

/** The home page is the job feed (D332): top jobs, then the long feed. */
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

async function JobFeed({ locale }: { locale: string }) {
  const t = await getTranslations("home");
  const result = await searchJobs(
    { limit: FEED_SIZE, minOverlap: 3, sort: "newest" },
    locale,
  );
  if (result.items.length === 0) {
    return (
      <Container>
        <EmptyState title={t("latestEmpty")} />
      </Container>
    );
  }
  const top = pickTop(result.items);
  const topIds = new Set(top.map((job) => job.id));
  const rest = result.items.filter((job) => !topIds.has(job.id));
  return (
    <>
      <section
        aria-labelledby="top-jobs"
        className="pt-8 pb-6 md:pt-10 md:pb-8"
      >
        <Container className="flex flex-col gap-6">
          <h2 id="top-jobs" className="t-h3">
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
      <section
        aria-labelledby="all-jobs"
        className="pt-6 pb-12 md:pt-8 md:pb-16"
      >
        <Container className="flex flex-col gap-6">
          <h2 id="all-jobs" className="t-h3">
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
      <section className="border-b border-line">
        <Container className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
          <h1 className="t-h2">{t("feedTitle")}</h1>
          <form
            id="search"
            action={`${localePrefix(locale)}/jobs`}
            method="get"
            className="flex w-full flex-col gap-3 sm:flex-row md:max-w-xl"
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
            <Button type="submit">{t("searchSubmit")}</Button>
          </form>
        </Container>
      </section>

      <Suspense fallback={null}>
        <JobFeed locale={locale} />
      </Suspense>

      <section
        id="faq"
        aria-labelledby="home-faq"
        className="scroll-mt-20 border-t border-line py-12 md:py-16"
      >
        <Container narrow className="flex flex-col gap-6">
          <h2 id="home-faq" className="t-h3">
            {t("faqTitle")}
          </h2>
          <div className="flex flex-col border-t border-line">
            {FAQ.map((key) => (
              <details key={key} className="group border-b border-line">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
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
    </main>
  );
}
