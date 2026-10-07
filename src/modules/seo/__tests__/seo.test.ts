import { afterEach, describe, expect, it } from "vitest";
import { jobPostingJsonLd, serializeJsonLd } from "../job-posting";
import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  homeGraphJsonLd,
  importedJobSummary,
} from "../markup";
import { ogClamp, ogCompanyCard, ogJobCard } from "../og";
import { languageAlternates, metaDescription, siteVerification } from "../site";

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
      url: "https://example.com/jobs/00000000-0000-4000-8000-000000000001",
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

describe("homepage graph (D282)", () => {
  it("names the product, points search at /jobs, and skips empty social links", () => {
    const graph = homeGraphJsonLd({
      name: "INTGETION JOB LIST",
      url: "https://intgetion.com",
      logoUrl: "https://intgetion.com/icon.svg",
      locale: "en",
    });
    const organization = graph["@graph"][0] as Record<string, unknown>;
    const website = graph["@graph"][1] as {
      potentialAction: { target: { urlTemplate: string } };
    };
    expect(organization.name).toBe("INTGETION JOB LIST");
    expect(organization.logo).toBe("https://intgetion.com/icon.svg");
    expect(organization.sameAs).toBeUndefined();
    expect(website.potentialAction.target.urlTemplate).toBe(
      "https://intgetion.com/jobs?q={search_term_string}",
    );
  });
});

describe("BreadcrumbList (D283)", () => {
  it("numbers every step and keeps the current page url", () => {
    const list = breadcrumbListJsonLd([
      { name: "Home", url: "https://intgetion.com/en" },
      { name: "Jobs", url: "https://intgetion.com/en/jobs" },
      { name: "Engineer", url: "https://intgetion.com/en/jobs/1" },
    ]);
    expect(list.itemListElement.map((item) => item.position)).toEqual([
      1, 2, 3,
    ]);
    expect(list.itemListElement[2]?.item).toBe(
      "https://intgetion.com/en/jobs/1",
    );
  });
});

describe("imported job summary (D281)", () => {
  it("is built from our fields and cannot repeat the source description", () => {
    const summary = importedJobSummary({
      title: "Solidity Engineer",
      company: "Acme",
      format: "Remote",
      employment: "Contract",
      timezone: "Worldwide",
      salary: "Salary not specified",
      skills: ["Solidity", "TypeScript"],
    });
    expect(summary).toBe(
      "Solidity Engineer — Acme. Remote. Contract. Worldwide. Salary not specified. Solidity, TypeScript.",
    );
    expect(summary).not.toContain("Build contracts.");
  });
});

describe("languageAlternates (D276)", () => {
  it("answers for every language and for everyone else", () => {
    expect(languageAlternates("/jobs")).toEqual({
      en: "http://localhost:3000/jobs",
      ru: "http://localhost:3000/ru/jobs",
      es: "http://localhost:3000/es/jobs",
      "x-default": "http://localhost:3000/jobs",
    });
  });
});

describe("FAQPage JSON-LD (D296)", () => {
  it("wraps every visible question in a Question with an answer", () => {
    const ld = faqPageJsonLd([
      { question: "How do jobs get here?", answer: "Nothing is paid for." },
      { question: "Remote?", answer: "The card shows the format." },
    ]);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "FAQPage",
    });
    expect(ld.mainEntity).toEqual([
      {
        "@type": "Question",
        name: "How do jobs get here?",
        acceptedAnswer: { "@type": "Answer", text: "Nothing is paid for." },
      },
      {
        "@type": "Question",
        name: "Remote?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The card shows the format.",
        },
      },
    ]);
  });

  it("stays empty when the page shows no questions", () => {
    expect(faqPageJsonLd([]).mainEntity).toEqual([]);
  });
});

describe("share pictures for a job and a company (D297)", () => {
  it("cuts a long title at a word and marks the cut", () => {
    expect(ogClamp("  Senior   Solidity Engineer ", 70)).toBe(
      "Senior Solidity Engineer",
    );
    const long =
      "Senior Solidity Engineer for a decentralised exchange and its liquidity desk";
    const cut = ogClamp(long, 70);
    expect(cut.length).toBeLessThanOrEqual(70);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut.startsWith("Senior Solidity Engineer")).toBe(true);
    // A single long word still gets cut rather than overflowing the picture.
    expect(ogClamp("a".repeat(90), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("builds the job lines from our own fields only", () => {
    const card = ogJobCard({
      title: "Solidity Engineer",
      company: "Acme",
      salary: "€5,000 – €7,000 / month",
      facts: ["Remote", "Full-time", "", "  "],
    });
    expect(card).toEqual({
      title: "Solidity Engineer",
      company: "Acme",
      salary: "€5,000 – €7,000 / month",
      facts: "Remote · Full-time",
    });
    expect(
      ogJobCard({
        title: "Solidity Engineer",
        company: "Acme",
        salary: null,
        facts: ["Remote"],
      }).salary,
    ).toBeNull();
  });

  it("counts a company's open roles through the caller's wording", () => {
    expect(
      ogCompanyCard({
        name: "Acme",
        openJobs: 0,
        jobsLabel: (count) => `${count} open roles`,
      }),
    ).toEqual({ name: "Acme", jobs: "0 open roles" });
  });
});

describe("site ownership proofs (D298)", () => {
  const keys = [
    "GOOGLE_SITE_VERIFICATION",
    "YANDEX_VERIFICATION",
    "BING_SITE_VERIFICATION",
  ] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  afterEach(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("leaves out a proof the founder has not set", () => {
    for (const key of keys) delete process.env[key];
    expect(siteVerification()).toEqual({});
  });

  it("passes each token through, trimmed", () => {
    process.env.GOOGLE_SITE_VERIFICATION = " g-token ";
    process.env.YANDEX_VERIFICATION = "y-token";
    process.env.BING_SITE_VERIFICATION = "b-token";
    expect(siteVerification()).toEqual({
      google: "g-token",
      yandex: "y-token",
      other: { "msvalidate.01": "b-token" },
    });
  });
});
