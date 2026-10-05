import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { catalogTag } from "@/config/markers";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { navForward } from "@/components/ui/page-transition";
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
import { breadcrumbListJsonLd } from "@/modules/seo/markup";
import { siteUrl } from "@/modules/seo/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const tag = catalogTag(slug);
  if (!tag) return {};
  const markers = await getTranslations({ locale, namespace: "markers" });
  const title =
    tag.kind === "high-paying"
      ? markers("highPayTitle")
      : markers("tagTitle", { name: slug });
  return {
    title,
    alternates: {
      types: {
        "application/rss+xml": `/${locale}/jobs/t/${slug}/rss.xml`,
      },
    },
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
  const categories = await getTranslations("categories");
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
  const name =
    tag.kind === "sector"
      ? markers(`sectors.${tag.sector}`)
      : tag.kind === "category"
        ? categories(tag.category)
        : tag.kind === "seniority"
          ? markers(`seniority.${tag.seniority}`)
          : tag.kind === "employment"
            ? jobs(tag.employment)
            : tag.kind === "remote"
              ? jobs("remote")
              : slug;
  const title =
    tag.kind === "high-paying"
      ? markers("highPayTitle")
      : markers("tagTitle", { name });
  const intro =
    tag.kind === "high-paying"
      ? markers("highPayIntro", { threshold: markers("highPayThreshold") })
      : markers("tagIntro", { name });
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    for (const item of Array.isArray(value) ? value : value ? [value] : [])
      nextParams.append(key, item);
  if (result.nextCursor) nextParams.set("cursor", result.nextCursor);

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
      </Container>
    </main>
  );
}
