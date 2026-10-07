import { randomUUID } from "node:crypto";
import pg from "pg";
import { expect, test } from "./fixtures";

// D260: salary pages by skill — numbers only from 10 own jobs.
test("a skill salary page shows numbers once it has 10 own jobs", async ({
  page,
  request,
}) => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DATABASE_URL is required for salaries e2e.");
  const client = new pg.Client({ connectionString });
  await client.connect();
  let slug: string;
  try {
    const free = await client.query<{ id: string; slug: string }>(
      `select s.id, s.slug from public.skills s
        where s.is_active
          and not exists (select 1 from public.job_skills js where js.skill_id = s.id)
        order by s.slug limit 1`,
    );
    const skill = free.rows[0];
    if (!skill) throw new Error("no unused skill for the salaries e2e");
    slug = skill.slug;

    // Thin data: the page answers, says so, and stays out of the index.
    await page.goto(`/en/salaries/${slug}`);
    await expect(page.getByText("Not enough", { exact: false })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );

    const userId = randomUUID();
    const companyId = randomUUID();
    await client.query(
      `insert into public.users (id, auth_uid, terms_accepted_at, terms_version)
       values ($1, $2, now(), 'salaries')`,
      [userId, randomUUID()],
    );
    await client.query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, 'Salary Co', $2, 'verified', $3)`,
      [companyId, `salary-${companyId.slice(0, 8)}`, userId],
    );
    for (let i = 0; i < 10; i++) {
      const jobId = randomUUID();
      await client.query(
        `insert into public.jobs (
           id, company_id, created_by, title, description, category,
           work_format, employment_type, application_method, source, status,
           published_at, expires_at, salary_min, salary_max, salary_currency,
           salary_period, salary_basis, seniority
         ) values ($1, $2, $3, $4,
           'Build reliable backend services with a collaborative remote team.',
           'engineering', 'remote', 'full_time', 'internal', 'internal',
           'published', now(), now() + interval '30 days',
           500000, 700000, 'USD', 'month', 'gross', 'senior')`,
        [jobId, companyId, userId, `Salary e2e role ${i}`],
      );
      await client.query(
        `insert into public.job_skills (job_id, skill_id, weight, min_level)
         values ($1, $2, 2, 'novice')`,
        [jobId, skill.id],
      );
    }
  } finally {
    await client.end();
  }

  await page.goto(`/en/salaries/${slug}`);
  // 5 000–7 000 USD a month → 72 000 a year at the midpoint.
  await expect(page.getByText("$72,000").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Senior" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.goto("/en/salaries");
  await expect(page.locator(`a[href="/salaries/${slug}"]`)).toBeVisible();
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    `/salaries/${slug}`,
  );

  expect((await request.get("/en/salaries/no-such-skill")).status()).toBe(404);
});
