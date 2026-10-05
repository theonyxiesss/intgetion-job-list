/** One step in a BreadcrumbList (D283). */
export type BreadcrumbItem = { name: string; url: string };

/** Schema.org BreadcrumbList. Every step has a URL, including the current page. */
export function breadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Organization and WebSite for the homepage (D282).
 * `sameAs` is omitted when the founder has not given social URLs.
 */
export function homeGraphJsonLd(input: {
  name: string;
  url: string;
  logoUrl: string;
  locale: string;
  sameAs?: string[];
}) {
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    name: input.name,
    url: input.url,
    logo: input.logoUrl,
  };
  if (input.sameAs && input.sameAs.length > 0) {
    organization.sameAs = input.sameAs;
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        name: input.name,
        url: input.url,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${input.url}/${input.locale}/jobs?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/**
 * A short imported-job blurb built only from our DTO fields (D281).
 * The source description is not an input, so it cannot leak in.
 */
export function importedJobSummary(input: {
  title: string;
  company: string;
  format: string;
  employment: string;
  timezone: string;
  salary: string;
  skills: string[];
}): string {
  const skills = input.skills.filter((skill) => skill.trim().length > 0);
  const parts = [
    `${input.title} — ${input.company}`,
    input.format,
    input.employment,
    input.timezone,
    input.salary,
    skills.length > 0 ? skills.join(", ") : "",
  ].filter((part) => part.trim().length > 0);
  return `${parts.join(". ")}.`;
}
