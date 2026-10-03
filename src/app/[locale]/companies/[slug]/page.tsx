import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  listPublishedJobsForCompany,
  getVisibleCompany,
} from "@/modules/jobs/service";

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
  const jobs = await listPublishedJobsForCompany(company.id, locale);
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
