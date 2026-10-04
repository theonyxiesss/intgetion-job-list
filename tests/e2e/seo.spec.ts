import { randomUUID } from "node:crypto";
import pg from "pg";
import { expect, test } from "./fixtures";

// D210–D211: robots, sitemap, job metadata and JobPosting JSON-LD.
test("robots and sitemap are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /*/admin");
  expect(robotsText).toContain("Sitemap: ");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('hreflang="ru"');
});

test("a job page has a title, a canonical URL and JobPosting data", async ({
  page,
}) => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DATABASE_URL is required for SEO e2e.");
  const userId = randomUUID();
  const companyId = randomUUID();
  const jobId = randomUUID();
  const title = `SEO e2e role ${jobId.slice(0, 6)}`;
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `insert into public.users (id, auth_uid, terms_accepted_at, terms_version)
       values ($1, $2, now(), 'seo')`,
      [userId, randomUUID()],
    );
    await client.query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, 'SEO Co', $2, 'verified', $3)`,
      [companyId, `seo-${companyId.slice(0, 8)}`, userId],
    );
    await client.query(
      `insert into public.jobs (
         id, company_id, created_by, title, description, category,
         work_format, employment_type, application_method, source, status,
         published_at, expires_at, salary_min, salary_max, salary_currency,
         salary_period, salary_basis
       ) values ($1, $2, $3, $4,
         'Build reliable backend services with a collaborative remote team.',
         'engineering', 'remote', 'full_time', 'internal', 'internal',
         'published', now(), now() + interval '30 days',
         500000, 700000, 'EUR', 'month', 'gross')`,
      [jobId, companyId, userId, title],
    );
  } finally {
    await client.end();
  }

  await page.goto(`/en/jobs/${jobId}`);
  await expect(page).toHaveTitle(new RegExp(`^${title} — SEO Co`));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`/en/jobs/${jobId}$`),
  );
  const raw = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  const data = JSON.parse(raw ?? "{}") as Record<string, unknown>;
  expect(data).toMatchObject({
    "@type": "JobPosting",
    title,
    employmentType: "FULL_TIME",
    jobLocationType: "TELECOMMUTE",
    hiringOrganization: { name: "SEO Co" },
    baseSalary: { currency: "EUR", value: { minValue: 5000, maxValue: 7000 } },
  });
});
