import { describe, expect, it } from "vitest";
import { jobPostingJsonLd, serializeJsonLd } from "../job-posting";
import { languageAlternates, metaDescription } from "../site";

const job = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Solidity Engineer",
  description: "Build contracts.",
  workFormat: "remote",
  employmentType: "contract",
  publishedAt: "2026-10-01T00:00:00.000Z",
  expiresAt: "2026-10-31T00:00:00.000Z",
  locationCountry: null,
  countryRestrictions: ["DE", "PL"],
  salaryMin: { amountMinor: "500000", currency: "EUR", period: "month" },
  salaryMax: { amountMinor: "700050", currency: "EUR", period: "month" },
  applicationMethod: "internal",
  company: { name: "Acme", slug: "acme" },
};

describe("JobPosting JSON-LD (D211)", () => {
  it("maps a remote contract job with a salary range", () => {
    const ld = jobPostingJsonLd(job, "https://example.com", "en");
    expect(ld).toMatchObject({
      "@type": "JobPosting",
      url: "https://example.com/en/jobs/00000000-0000-4000-8000-000000000001",
      employmentType: "CONTRACTOR",
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: [
        { "@type": "Country", name: "DE" },
        { "@type": "Country", name: "PL" },
      ],
      validThrough: "2026-10-31T00:00:00.000Z",
      baseSalary: {
        currency: "EUR",
        value: { minValue: 5000, maxValue: 7000.5, unitText: "MONTH" },
      },
      directApply: true,
    });
  });

  it("uses a postal address for an onsite job and skips a missing salary", () => {
    const ld = jobPostingJsonLd(
      {
        ...job,
        workFormat: "onsite",
        locationCountry: "DE",
        salaryMin: null,
        salaryMax: null,
        applicationMethod: "external_url",
      },
      "https://example.com",
      "ru",
    );
    expect(ld.jobLocation).toEqual({
      "@type": "Place",
      address: { "@type": "PostalAddress", addressCountry: "DE" },
    });
    expect(ld.baseSalary).toBeUndefined();
    expect(ld.jobLocationType).toBeUndefined();
    expect(ld.directApply).toBe(false);
  });

  it("cannot close the script tag from job text", () => {
    const text = serializeJsonLd({ description: "</script><b>&" });
    expect(text).not.toContain("</script>");
    expect(JSON.parse(text)).toEqual({ description: "</script><b>&" });
  });
});

describe("meta description", () => {
  it("collapses whitespace and cuts at a word", () => {
    expect(metaDescription("a  b\n\nc")).toBe("a b c");
    const long = metaDescription("word ".repeat(60));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("languageAlternates (D276)", () => {
  it("answers for both languages and for everyone else", () => {
    expect(languageAlternates("/jobs")).toEqual({
      en: "http://localhost:3000/en/jobs",
      ru: "http://localhost:3000/ru/jobs",
      "x-default": "http://localhost:3000/en/jobs",
    });
  });
});
