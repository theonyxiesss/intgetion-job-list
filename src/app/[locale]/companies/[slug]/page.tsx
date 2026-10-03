import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getHiddenSetsForViewer } from "@/modules/feedback/service";
import {
  listPublishedJobsForCompany,
  getVisibleCompany,
} from "@/modules/jobs/service";

// Personalized: the viewer's hidden companies/jobs are filtered out (4B).
export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("companyPage");
  const company = await getVisibleCompany(slug);
  if (!company) notFound();
  let viewer: Parameters<typeof listPublishedJobsForCompany>[2] = {
    hidden: null,
  };
  try {
    const supabase = await createSupabaseServerClient();
    const viewerUser = await getCurrentUser(supabase.auth);
    if (viewerUser) {
      viewer = { hidden: await getHiddenSetsForViewer(viewerUser.id) };
    }
  } catch {
    // No request scope (prerender) → guest view.
  }
  const jobs = await listPublishedJobsForCompany(company.id, locale, viewer);
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center gap-4">
        {company.logoPath && (
          <span
            role="img"
            aria-label={t("companyLogo")}
            className="flex size-[72px] items-center justify-center rounded border bg-cover bg-center"
            style={{
              backgroundImage: `url(${JSON.stringify(company.logoPath).slice(1, -1)})`,
            }}
          />
        )}
        <div>
          <h1 className="text-3xl font-semibold">{company.name}</h1>
          <p>
            {company.isTrusted
              ? t("trusted")
              : company.status === "verified"
                ? t("verified")
                : ""}
          </p>
        </div>
      </header>
      {company.description && (
        <p className="max-w-3xl whitespace-pre-wrap">{company.description}</p>
      )}
      <h2 className="text-2xl font-semibold">{t("openRoles")}</h2>
      {jobs.length ? (
        <ul className="grid gap-3">
          {jobs.map((job) => (
            <li key={job.id} className="rounded border p-4">
              <Link
                className="font-semibold underline"
                href={`/${locale}/jobs/${job.id}`}
              >
                {job.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("empty")}</p>
      )}
    </main>
  );
}
