import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getHiddenSetsForViewer } from "@/modules/feedback/service";
import {
  listPublishedJobsForCompany,
  getVisibleCompany,
} from "@/modules/jobs/service";
import { PublicJobCard } from "@/modules/jobs/ui/public-job-card";
import { isFollowing } from "@/modules/follows/service";
import { FollowButton } from "@/modules/follows/ui/follow-button";
import { JsonLd } from "@/modules/seo/json-ld";
import { breadcrumbListJsonLd } from "@/modules/seo/markup";
import {
  languageAlternates,
  metaDescription,
  siteUrl,
} from "@/modules/seo/site";

export const dynamic = "force-dynamic";

/** Company title, description and canonical for search (D211). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const company = await getVisibleCompany(slug);
  if (!company) return {};
  const description = company.description
    ? metaDescription(company.description)
    : undefined;
  return {
    title: company.name,
    ...(description ? { description } : {}),
    alternates: {
      canonical: `${siteUrl()}/${locale}/companies/${company.slug}`,
      languages: languageAlternates(`/companies/${company.slug}`),
    },
    openGraph: { type: "website", title: company.name, description },
  };
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale, slug } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("companyPage");
  const seo = await getTranslations("seo");
  const company = await getVisibleCompany(slug);
  if (!company) notFound();
  let viewer: Parameters<typeof listPublishedJobsForCompany>[2] = {
    hidden: null,
  };
  let viewerId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const viewerUser = await getCurrentUser(supabase.auth);
    if (viewerUser) {
      viewerId = viewerUser.id;
      viewer = { hidden: await getHiddenSetsForViewer(viewerUser.id) };
    }
  } catch {
    // No request scope (prerender) → guest view.
  }
  const [jobs, following] = await Promise.all([
    listPublishedJobsForCompany(company.id, locale, viewer),
    viewerId ? isFollowing(viewerId, company.id) : false,
  ]);
  const jobsTab = tab === "jobs";
  const initials = company.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");

  return (
    <main className="py-10 md:py-16">
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: seo("home"), url: `${siteUrl()}/${locale}` },
          {
            name: company.name,
            url: `${siteUrl()}/${locale}/companies/${company.slug}`,
          },
        ])}
      />
      <Container className="flex flex-col gap-8">
        <header className="flex flex-wrap items-end gap-4">
          <span
            role={company.logoPath ? "img" : undefined}
            aria-label={company.logoPath ? t("companyLogo") : undefined}
            aria-hidden={company.logoPath ? undefined : true}
            className="t-h3 flex size-16 items-center justify-center border border-line"
          >
            {initials}
          </span>
          <PageHeader
            title={company.name}
            label={
              company.isTrusted
                ? t("trusted")
                : company.status === "verified"
                  ? t("verified")
                  : undefined
            }
          />
          <div className="ml-auto">
            <FollowButton
              slug={slug}
              initial={following}
              signedIn={viewerId !== null}
            />
          </div>
        </header>
        <LinkTabs
          label={t("tabsLabel")}
          items={[
            {
              label: t("about"),
              href: `/companies/${slug}`,
              active: !jobsTab,
            },
            {
              label: t("jobsTab"),
              href: `/companies/${slug}?tab=jobs`,
              active: jobsTab,
              count: jobs.length,
            },
          ]}
        />
        {jobsTab ? (
          jobs.length ? (
            <ul className="grid gap-4">
              {jobs.map((job) => (
                <li key={job.id}>
                  <PublicJobCard job={job} locale={locale} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("empty")} />
          )
        ) : company.description ? (
          <p className="max-w-[68ch] whitespace-pre-wrap">
            {company.description}
          </p>
        ) : (
          <EmptyState title={t("emptyAbout")} />
        )}
      </Container>
    </main>
  );
}
