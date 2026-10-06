/**
 * Palette and wording for generated social images (D278). Plain hex, because
 * the image is drawn on the server and cannot read CSS variables; the values
 * mirror the dark theme tokens in globals.css.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export const OG_COLORS = {
  background: "#000000",
  foreground: "#f5f5f5",
  muted: "#a1a1aa",
  line: "#26262a",
  signal: "#5b8cff",
} as const;

/**
 * Fixed wording of the image. The built-in font (Geist) covers Cyrillic,
 * the dash, the ellipsis and the middle dot, so a Russian title draws too (D297).
 */
export const OG_TEXT = {
  wordmark: "INTGETION",
  sub: "JOB LIST",
  tagline: "Remote jobs in Web3 and crypto",
  domain: "intgetion.com",
  alt: "INTGETION Job List — remote jobs in Web3 and crypto",
} as const;

/** Longest title that still fits two lines of the job image (D297). */
const OG_TITLE_LIMIT = 70;
const OG_COMPANY_LIMIT = 40;

/** Cuts at a word boundary and marks the cut, so nothing looks half-drawn. */
export function ogClamp(value: string, limit: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * The lines of a job's share picture (D297). Built from our own DTO fields,
 * never from the source description, so an imported text cannot leak into it
 * (same rule as D281).
 */
export function ogJobCard(input: {
  title: string;
  company: string;
  salary: string | null;
  facts: string[];
}): { title: string; company: string; salary: string | null; facts: string } {
  return {
    title: ogClamp(input.title, OG_TITLE_LIMIT),
    company: ogClamp(input.company, OG_COMPANY_LIMIT),
    salary: input.salary ? ogClamp(input.salary, OG_COMPANY_LIMIT) : null,
    facts: input.facts
      .map((fact) => fact.trim())
      .filter((fact) => fact.length > 0)
      .join(" · "),
  };
}

/** The lines of a company's share picture (D297). */
export function ogCompanyCard(input: {
  name: string;
  openJobs: number;
  jobsLabel: (count: number) => string;
}): { name: string; jobs: string } {
  return {
    name: ogClamp(input.name, OG_COMPANY_LIMIT),
    jobs: input.jobsLabel(input.openJobs),
  };
}
