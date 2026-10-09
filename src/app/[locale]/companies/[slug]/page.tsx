import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompanyLinks, CompanyMarkFor } from "@/components/ui/company-mark";
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
import { localePrefix } from "@/i18n/paths";

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
      canonical: `${siteUrl()}${localePrefix(locale)}/companies/${company.slug}`,
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

  return (
    <main className="py-10 md:py-16">
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: seo("home"), url: `${siteUrl()}${localePrefix(locale)}` },
          {
            name: company.name,
            url: `${siteUrl()}${localePrefix(locale)}/companies/${company.slug}`,
          },
        ])}
      />
      <Container className="flex flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-0 items-start gap-4 sm:items-end">
            <CompanyMarkFor company={company} size="profile" />
            <div className="min-w-0 flex-1 sm:flex-none">
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
            </div>
          </div>
          <div className="sm:ml-auto">
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
        ) : company.description ||
          company.websiteUrl ||
          company.linkedinUrl ||
          company.telegramUrl ||
          company.xUrl ? (
          <div className="flex max-w-[68ch] flex-col gap-4">
            <CompanyLinks
              links={[
                { href: company.websiteUrl, label: t("links.website") },
                { href: company.linkedinUrl, label: t("links.linkedin") },
                { href: company.telegramUrl, label: t("links.telegram") },
                { href: company.xUrl, label: t("links.x") },
              ]}
            />
            {company.description ? (
              <p className="whitespace-pre-wrap">{company.description}</p>
            ) : null}
          </div>
        ) : (
          <EmptyState title={t("emptyAbout")} />
        )}
      </Container>
    </main>
  );
}
