import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CatalogTag } from "@/config/markers";
import { catalogTag, relatedTags } from "@/config/markers";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { navForward } from "@/components/ui/page-transition";
import { tagIntro } from "@/content/tag-intros";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getHiddenSetsForViewer } from "@/modules/feedback/service";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { searchJobs } from "@/modules/jobs/service";
import { tagSearchOverrides } from "@/modules/jobs/service/tag-query";
import { PublicJobCard } from "@/modules/jobs/ui/public-job-card";
import { QuickFilters } from "@/modules/jobs/ui/quick-filters";
import { JsonLd } from "@/modules/seo/json-ld";
import { breadcrumbListJsonLd, faqPageJsonLd } from "@/modules/seo/markup";
import {
  languageAlternates,
  metaDescription,
  siteUrl,
} from "@/modules/seo/site";
import { tagLabel } from "@/modules/seo/tag-label";

export const dynamic = "force-dynamic";

/** A collection thinner than this is not worth a place in the index (D296). */
const MIN_INDEXABLE_JOBS = 3;

/** Jobs on the page, capped — only «fewer than three or not» is needed. */
async function countForIndexing(tag: CatalogTag): Promise<number> {
  const overrides = await tagSearchOverrides(tag);
  if (!overrides) return 0;
  const parsed = jobSearchQuery.safeParse({
    ...overrides,
    limit: String(MIN_INDEXABLE_JOBS),
  });
  if (!parsed.success) return 0;
  const result = await searchJobs(parsed.data);
  return result.items.length;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const tag = catalogTag(slug);
  if (!tag) return {};
  const markers = await getTranslations({ locale, namespace: "markers" });
  const name = await tagLabel(tag, locale, slug);
  const title =
    tag.kind === "high-paying"
      ? markers("highPayTitle")
      : markers("tagTitle", { name });
  const found = tag.kind === "for-you" ? 0 : await countForIndexing(tag);
  return {
    title,
    // The page's own words describe it better than a template (D299).
    description: (() => {
      const written = tagIntro(slug, locale);
      return written
        ? metaDescription(written)
        : markers("tagDescription", { name });
    })(),
    alternates: {
      canonical: `${siteUrl()}/${locale}/jobs/t/${slug}`,
      languages: languageAlternates(`/jobs/t/${slug}`),
      types: {
        "application/rss+xml": `/${locale}/jobs/t/${slug}/rss.xml`,
      },
    },
    // A near-empty collection stays crawlable but out of the index (D296).
    robots:
      found < MIN_INDEXABLE_JOBS ? { index: false, follow: true } : undefined,
  };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tag = catalogTag(slug);
  if (!tag || tag.kind === "for-you") notFound();
  const overrides = await tagSearchOverrides(tag);
  if (!overrides) notFound();
  const markers = await getTranslations("markers");
  const seo = await getTranslations("seo");
  const jobs = await getTranslations("jobs");
  const raw = await searchParams;
  const parsed = jobSearchQuery.safeParse({ ...raw, ...overrides });
  let viewer: Parameters<typeof searchJobs>[2] = { hidden: null };
  let signedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const viewerUser = await getCurrentUser(supabase.auth);
    if (viewerUser) {
      signedIn = true;
      viewer = { hidden: await getHiddenSetsForViewer(viewerUser.id) };
    }
  } catch {
    // Guest view.
  }
  const result = await searchJobs(
    parsed.success ? parsed.data : jobSearchQuery.parse(overrides),
    locale,
    viewer,
  );
  const name = await tagLabel(tag, locale, slug);
  const title =
    tag.kind === "high-paying"
      ? markers("highPayTitle")
      : markers("tagTitle", { name });
  const intro =
    tag.kind === "high-paying"
      ? markers("highPayIntro", { threshold: markers("highPayThreshold") })
      : markers("tagIntro", { name });
  // A text written for this collection, when it has one (D299).
  const written = tagIntro(slug, locale);
  const neighbours = await Promise.all(
    relatedTags(slug).map(async (near) => ({
      slug: near.slug,
      label: await tagLabel(near, locale, near.slug),
    })),
  );
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    for (const item of Array.isArray(value) ? value : value ? [value] : [])
      nextParams.append(key, item);
  if (result.nextCursor) nextParams.set("cursor", result.nextCursor);
  // The FAQ and its markup appear together, and only on a page worth indexing.
  const faq =
    result.items.length >= MIN_INDEXABLE_JOBS
      ? ([1, 2, 3] as const).map((index) => ({
          question: markers(`faq.q${index}` as "faq.q1", { name }),
          answer: markers(`faq.a${index}` as "faq.a1", { name }),
        }))
      : [];

  return (
    <main className="py-10 md:py-16">
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: seo("home"), url: `${siteUrl()}/${locale}` },
          { name: seo("jobs"), url: `${siteUrl()}/${locale}/jobs` },
          {
            name: title,
            url: `${siteUrl()}/${locale}/jobs/t/${slug}`,
          },
        ])}
      />
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={title}
          intro={intro}
          actions={
            <a
              className="t-label text-fg-muted"
              href={`/${locale}/jobs/t/${slug}/rss.xml`}
            >
              {markers("rss")}
            </a>
          }
        />
        {tag.kind === "high-paying" ? (
          <p className="font-mono text-fg-muted">
            {markers("highPayThreshold")}
          </p>
        ) : null}
        {written ? (
          <section className="flex max-w-3xl flex-col gap-4">
            <p className="text-fg-muted">{written}</p>
          </section>
        ) : null}
        <QuickFilters signedIn={signedIn} activeSlug={slug} />
        {result.items.length ? (
          <ul className="grid gap-4">
            {result.items.map((job) => (
              <li key={job.id}>
                <PublicJobCard job={job} locale={locale} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={jobs("empty")} />
        )}
        {result.nextCursor ? (
          <Link
            className={buttonClass("secondary")}
            href={`?${nextParams.toString()}`}
            {...navForward}
          >
            {jobs("next")}
          </Link>
        ) : null}
        {neighbours.length ? (
          <nav className="flex flex-col gap-3" aria-label={markers("nearby")}>
            <h2 className="t-h3">{markers("nearby")}</h2>
            <ul className="flex flex-wrap gap-2">
              {neighbours.map((near) => (
                <li key={near.slug}>
                  <Link
                    className="t-label border border-line px-3 py-2 text-fg-muted"
                    href={`/jobs/t/${near.slug}`}
                  >
                    {near.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {faq.length ? (
          <section className="flex flex-col gap-4">
            <h2 className="t-h2">{markers("faq.title")}</h2>
            <dl className="flex flex-col gap-4">
              {faq.map((item) => (
                <div key={item.question} className="flex flex-col gap-1">
                  <dt className="t-label">{item.question}</dt>
                  <dd className="text-fg-muted">{item.answer}</dd>
                </div>
              ))}
            </dl>
            <JsonLd data={faqPageJsonLd(faq)} />
          </section>
        ) : null}
      </Container>
    </main>
  );
}
