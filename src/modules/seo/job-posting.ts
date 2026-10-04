/**
 * schema.org JobPosting for Google Jobs (D211). Pure: the job page passes
 * the public job DTO. Only fields the DTO already exposes publicly.
 */

export interface JobPostingInput {
  id: string;
  title: string;
  description: string;
  workFormat: string;
  employmentType: string;
  publishedAt: string | null;
  expiresAt: string | null;
  locationCountry: string | null;
  countryRestrictions: readonly string[] | null;
  salaryMin: { amountMinor: string; currency: string; period: string } | null;
  salaryMax: { amountMinor: string; currency: string; period: string } | null;
  applicationMethod: string;
  company: { name: string; slug: string };
}

const EMPLOYMENT: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  freelance: "CONTRACTOR",
  internship: "INTERN",
};

const PERIOD: Record<string, string> = {
  hour: "HOUR",
  month: "MONTH",
  year: "YEAR",
};

/** Minor units → a decimal number; amounts here are far below 2^53. */
function major(amountMinor: string): number {
  return Number(BigInt(amountMinor)) / 100;
}

function salary(job: JobPostingInput) {
  const low = job.salaryMin;
  if (!low) return undefined;
  const high = job.salaryMax;
  return {
    "@type": "MonetaryAmount",
    currency: low.currency,
    value: {
      "@type": "QuantitativeValue",
      minValue: major(low.amountMinor),
      ...(high ? { maxValue: major(high.amountMinor) } : {}),
      unitText: PERIOD[low.period] ?? "YEAR",
    },
  };
}

function countries(codes: readonly string[]) {
  return codes.map((code) => ({ "@type": "Country", name: code }));
}

export function jobPostingJsonLd(
  job: JobPostingInput,
  siteUrl: string,
  locale: string,
): Record<string, unknown> {
  const remote = job.workFormat === "remote";
  const restrictions = job.countryRestrictions ?? [];
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    identifier: { "@type": "PropertyValue", name: "INTGETION", value: job.id },
    url: `${siteUrl}/${locale}/jobs/${job.id}`,
    ...(job.publishedAt ? { datePosted: job.publishedAt } : {}),
    ...(job.expiresAt ? { validThrough: job.expiresAt } : {}),
    employmentType: EMPLOYMENT[job.employmentType] ?? "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company.name,
      sameAs: `${siteUrl}/${locale}/companies/${job.company.slug}`,
    },
    ...(remote
      ? {
          jobLocationType: "TELECOMMUTE",
          ...(restrictions.length > 0
            ? { applicantLocationRequirements: countries(restrictions) }
            : {}),
        }
      : job.locationCountry
        ? {
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressCountry: job.locationCountry,
              },
            },
          }
        : {}),
    ...(salary(job) ? { baseSalary: salary(job) } : {}),
    directApply: job.applicationMethod !== "external_url",
  };
}

/** JSON for a <script type="application/ld+json">: no "</script>" escape. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
