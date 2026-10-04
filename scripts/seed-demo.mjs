/**
 * Demo content (D212): 8 companies and ~40 published jobs so the catalog,
 * company pages, matching and RSS have something to show.
 *
 *   node scripts/seed-demo.mjs            # local database only
 *   node scripts/seed-demo.mjs --cloud    # the shared dev database (ask first)
 *   node scripts/seed-demo.mjs --remove [--cloud]
 *   node scripts/seed-demo.mjs --verify   # CI: exactly one copy exists
 *
 * Everything is marked: company slugs start with `demo-`, names end with
 * "(demo)", ids are md5-derived, so a rerun changes nothing and --remove
 * deletes exactly this data (jobs go with their company, ON DELETE CASCADE).
 */
import pg from "pg";
import { isLoopback, loadLocalEnv, pgConfig, redact } from "./db-url.mjs";

loadLocalEnv();
const args = new Set(process.argv.slice(2));
const url = process.env.DATABASE_MIGRATION_URL;
if (!url) throw new Error("DATABASE_MIGRATION_URL is not set");
if (!isLoopback(url) && !args.has("--cloud")) {
  throw new Error("Not a local database: pass --cloud to seed it on purpose");
}

// City for hybrid and onsite jobs: the jobs table requires a location then.
const cities = { NL: "Amsterdam", CZ: "Prague" };

const companies = [
  [
    "orbit-labs",
    "Orbit Labs",
    "Web3 infrastructure: RPC nodes, indexers and wallets for EVM chains.",
    "DE",
  ],
  [
    "nebula-pay",
    "Nebula Pay",
    "Payments and stablecoin rails for online businesses.",
    "EE",
  ],
  [
    "kite-analytics",
    "Kite Analytics",
    "Product analytics and ML forecasting for SaaS teams.",
    "PL",
  ],
  [
    "lumen-studio",
    "Lumen Studio",
    "Indie game studio building cosy multiplayer games.",
    "PT",
  ],
  [
    "harbor-health",
    "Harbor Health",
    "Telemedicine platform for clinics across Europe.",
    "NL",
  ],
  [
    "polaris-learning",
    "Polaris Learning",
    "Online courses and coding bootcamps.",
    "LT",
  ],
  [
    "atlas-logistics",
    "Atlas Logistics",
    "Freight tracking and warehouse software.",
    "CZ",
  ],
  [
    "zenith-exchange",
    "Zenith Exchange",
    "Crypto exchange with spot and derivatives trading.",
    "CY",
  ],
];

// [company, title, category, employment, format, salary [min, max, currency, period] | null, tz | null, skills]
const jobs = [
  [
    "orbit-labs",
    "Senior Solidity Engineer",
    "engineering",
    "full_time",
    "remote",
    [8000, 11000, "USD", "month"],
    "Europe/Berlin",
    ["typescript", "node", "git"],
  ],
  [
    "orbit-labs",
    "Rust Backend Engineer (Indexers)",
    "engineering",
    "full_time",
    "remote",
    [90000, 130000, "EUR", "year"],
    null,
    ["rust", "postgresql", "docker"],
  ],
  [
    "orbit-labs",
    "DevRel / Developer Advocate",
    "marketing",
    "full_time",
    "remote",
    [5000, 7000, "USD", "month"],
    null,
    ["contentmarketing", "javascript"],
  ],
  [
    "orbit-labs",
    "Community Manager (Discord, Telegram)",
    "marketing",
    "part_time",
    "remote",
    [2000, 3000, "USD", "month"],
    null,
    ["socialmediamarketing"],
  ],
  [
    "orbit-labs",
    "Technical Writer, SDK Docs",
    "product",
    "contract",
    "remote",
    null,
    null,
    ["copywriting", "git"],
  ],
  [
    "nebula-pay",
    "Backend Engineer, Payments (Go)",
    "engineering",
    "full_time",
    "remote",
    [6000, 8500, "EUR", "month"],
    "Europe/Tallinn",
    ["go", "postgresql", "kubernetes"],
  ],
  [
    "nebula-pay",
    "Compliance Officer (AML/KYC)",
    "finance",
    "full_time",
    "remote",
    [70000, 95000, "EUR", "year"],
    "Europe/Tallinn",
    ["financialanalysis"],
  ],
  [
    "nebula-pay",
    "Product Manager, Merchant Tools",
    "product",
    "full_time",
    "remote",
    [7000, 9000, "EUR", "month"],
    null,
    ["productmanagement", "roadmapping", "abtesting"],
  ],
  [
    "nebula-pay",
    "Customer Support Specialist (RU/EN)",
    "support",
    "full_time",
    "remote",
    [1800, 2400, "EUR", "month"],
    "Europe/Moscow",
    ["customersupport", "zendesk"],
  ],
  [
    "nebula-pay",
    "Financial Analyst",
    "finance",
    "full_time",
    "remote",
    null,
    null,
    ["financialanalysis", "fpa"],
  ],
  [
    "kite-analytics",
    "Data Engineer (Airflow, Spark)",
    "data",
    "full_time",
    "remote",
    [85000, 115000, "USD", "year"],
    null,
    ["python", "apacheairflow", "apachespark"],
  ],
  [
    "kite-analytics",
    "Machine Learning Engineer",
    "data",
    "full_time",
    "remote",
    [9000, 12000, "USD", "month"],
    null,
    ["python", "machinelearning", "pandas"],
  ],
  [
    "kite-analytics",
    "Frontend Engineer (React, TypeScript)",
    "engineering",
    "full_time",
    "remote",
    [5500, 7500, "EUR", "month"],
    "Europe/Warsaw",
    ["react", "typescript", "next"],
  ],
  [
    "kite-analytics",
    "Data Analyst, Product",
    "data",
    "full_time",
    "remote",
    [4000, 5500, "EUR", "month"],
    null,
    ["sql", "tableau", "productanalytics"],
  ],
  [
    "kite-analytics",
    "Junior QA Engineer",
    "engineering",
    "full_time",
    "remote",
    [1800, 2500, "EUR", "month"],
    null,
    ["javascript", "jira"],
  ],
  [
    "lumen-studio",
    "Unity Gameplay Programmer",
    "engineering",
    "full_time",
    "remote",
    [4500, 6500, "EUR", "month"],
    "Europe/Lisbon",
    ["csharp", "git"],
  ],
  [
    "lumen-studio",
    "3D Artist",
    "design",
    "contract",
    "remote",
    [35, 55, "EUR", "hour"],
    null,
    ["illustrator", "photoshop"],
  ],
  [
    "lumen-studio",
    "UI/UX Designer (Games)",
    "design",
    "full_time",
    "remote",
    [4000, 5500, "EUR", "month"],
    null,
    ["figma", "uxdesign", "prototyping"],
  ],
  [
    "lumen-studio",
    "Game Community & Social Media Manager",
    "marketing",
    "part_time",
    "remote",
    null,
    null,
    ["socialmediamarketing", "contentmarketing"],
  ],
  [
    "harbor-health",
    "Full-stack Engineer (Node, React)",
    "engineering",
    "full_time",
    "remote",
    [6000, 8000, "EUR", "month"],
    "Europe/Amsterdam",
    ["node", "react", "postgresql"],
  ],
  [
    "harbor-health",
    "Product Designer",
    "design",
    "full_time",
    "hybrid",
    [65000, 80000, "EUR", "year"],
    null,
    ["figma", "designsystems", "userresearch"],
  ],
  [
    "harbor-health",
    "Customer Success Manager",
    "support",
    "full_time",
    "remote",
    [3500, 4500, "EUR", "month"],
    null,
    ["customersuccess", "customeronboarding"],
  ],
  [
    "harbor-health",
    "People Partner (HR)",
    "hr",
    "full_time",
    "remote",
    [4000, 5000, "EUR", "month"],
    null,
    ["employeerelations", "recruiting"],
  ],
  [
    "polaris-learning",
    "Python Mentor (part-time)",
    "engineering",
    "part_time",
    "remote",
    [25, 40, "USD", "hour"],
    null,
    ["python", "git"],
  ],
  [
    "polaris-learning",
    "Content Marketing Lead",
    "marketing",
    "full_time",
    "remote",
    [4500, 6000, "EUR", "month"],
    null,
    ["contentmarketing", "seo", "copywriting"],
  ],
  [
    "polaris-learning",
    "Sales Manager, B2B (CIS)",
    "sales",
    "full_time",
    "remote",
    [3000, 4500, "USD", "month"],
    "Europe/Moscow",
    ["b2bsales", "crm", "negotiation"],
  ],
  [
    "polaris-learning",
    "Recruiter, Tech Hiring",
    "hr",
    "contract",
    "remote",
    null,
    null,
    ["recruiting", "talentsourcing", "interviewing"],
  ],
  [
    "polaris-learning",
    "Junior Video Editor",
    "design",
    "part_time",
    "remote",
    [1200, 1600, "EUR", "month"],
    null,
    ["adobexd"],
  ],
  [
    "atlas-logistics",
    "Senior Java Engineer",
    "engineering",
    "full_time",
    "remote",
    [80000, 105000, "EUR", "year"],
    "Europe/Prague",
    ["java", "kotlin", "aws"],
  ],
  [
    "atlas-logistics",
    "Operations Manager",
    "operations",
    "full_time",
    "onsite",
    [3500, 4500, "EUR", "month"],
    null,
    ["operationsmanagement", "supplychain", "logistics"],
  ],
  [
    "atlas-logistics",
    "Procurement Specialist",
    "operations",
    "full_time",
    "remote",
    null,
    null,
    ["procurement", "vendormanagement"],
  ],
  [
    "atlas-logistics",
    "DevOps Engineer (Kubernetes, AWS)",
    "engineering",
    "full_time",
    "remote",
    [6500, 8500, "EUR", "month"],
    null,
    ["kubernetes", "aws", "docker"],
  ],
  [
    "atlas-logistics",
    "Account Executive",
    "sales",
    "full_time",
    "remote",
    [50000, 70000, "EUR", "year"],
    null,
    ["sales", "salesforce", "leadgeneration"],
  ],
  [
    "zenith-exchange",
    "Quant Developer (Python, C++)",
    "engineering",
    "full_time",
    "remote",
    [12000, 16000, "USD", "month"],
    null,
    ["python", "cpp"],
  ],
  [
    "zenith-exchange",
    "Market Risk Analyst",
    "finance",
    "full_time",
    "remote",
    [90000, 120000, "USD", "year"],
    null,
    ["financialanalysis", "sql"],
  ],
  [
    "zenith-exchange",
    "Security Engineer",
    "engineering",
    "full_time",
    "remote",
    [9000, 12500, "USD", "month"],
    null,
    ["go", "kubernetes", "aws"],
  ],
  [
    "zenith-exchange",
    "Support Agent, 24/7 Shifts (RU/EN)",
    "support",
    "full_time",
    "remote",
    [1500, 2000, "USD", "month"],
    "Asia/Dubai",
    ["customersupport", "helpdesk"],
  ],
  [
    "zenith-exchange",
    "Growth Marketing Manager",
    "marketing",
    "full_time",
    "remote",
    [6000, 8000, "USD", "month"],
    null,
    ["googleads", "conversionoptimization", "googleanalytics"],
  ],
  [
    "zenith-exchange",
    "Listings & Partnerships Manager",
    "sales",
    "full_time",
    "remote",
    null,
    null,
    ["accountmanagement", "negotiation"],
  ],
  [
    "zenith-exchange",
    "Head of People",
    "hr",
    "full_time",
    "remote",
    [100000, 140000, "USD", "year"],
    null,
    ["peopleoperations", "compensation"],
  ],
];

function description(title, company) {
  return [
    `${company} (demo) is hiring a ${title}.`,
    "This is demonstration content for the INTGETION JOB LIST platform: the company and the role are fictional.",
    "You will work with a distributed team, own your area end to end and write things down.",
    "",
    `${company} (демо) ищет: ${title}.`,
    "Это демонстрационная вакансия платформы INTGETION JOB LIST: компания и роль вымышлены.",
  ].join("\n");
}

const client = new pg.Client(pgConfig(url));
client.on("error", (error) => console.error(redact(error.message)));
await client.connect();
try {
  if (args.has("--verify")) {
    const { rows } = await client.query(
      `select count(*)::int as n from public.jobs j
       join public.companies c on c.id = j.company_id
       where c.slug like 'demo-%'`,
    );
    if (rows[0].n !== jobs.length) {
      throw new Error(`expected ${jobs.length} demo jobs, found ${rows[0].n}`);
    }
    console.log(`Verified ${rows[0].n} demo jobs.`);
  } else if (args.has("--remove")) {
    const { rowCount } = await client.query(
      "delete from public.companies where slug like 'demo-%' and name like '%(demo)'",
    );
    console.log(`Removed ${rowCount} demo companies and their jobs.`);
  } else {
    await client.query("begin");
    for (const [slug, name, text, country] of companies) {
      await client.query(
        `insert into public.companies (id, name, slug, description, country, status, size)
         values (md5('demo-company-' || $1)::uuid, $2, $3, $4, $5, 'verified', 's11_50')
         on conflict (slug) do nothing`,
        [
          slug,
          `${name} (demo)`,
          `demo-${slug}`,
          `${text} Demo company.`,
          country,
        ],
      );
    }
    let index = 0;
    for (const [
      company,
      title,
      category,
      employment,
      format,
      salary,
      tz,
      skills,
    ] of jobs) {
      index += 1;
      const companyName = companies.find(([slug]) => slug === company)[1];
      const id = `demo-job-${company}-${index}`;
      await client.query(
        `insert into public.jobs (
           id, company_id, title, description, category, work_format, employment_type,
           application_method, status, published_at, expires_at,
           salary_min, salary_max, salary_currency, salary_period, salary_basis,
           timezone_required, work_hours_start, work_hours_end, min_overlap_hours,
           location_country, location
         ) values (
           md5($1)::uuid, md5('demo-company-' || $2)::uuid, $3, $4, $5,
           $6::work_format, $7::employment_type, 'internal', 'published',
           now() - ($8 || ' hours')::interval, now() + interval '30 days',
           $9, $10, $11, $12::salary_period, $13::salary_basis,
           $14, $15::time, $16::time, $17, $18, $19
         ) on conflict (id) do nothing`,
        [
          id,
          company,
          title,
          description(title, companyName),
          category,
          format,
          employment,
          String(index * 7),
          salary ? BigInt(salary[0]) * 100n : null,
          salary ? BigInt(salary[1]) * 100n : null,
          salary ? salary[2] : null,
          salary ? salary[3] : null,
          salary ? "gross" : null,
          tz,
          tz ? "09:00" : null,
          tz ? "18:00" : null,
          tz ? 4 : 0,
          format === "remote"
            ? null
            : companies.find(([slug]) => slug === company)[3],
          format === "remote"
            ? null
            : cities[companies.find(([slug]) => slug === company)[3]],
        ],
      );
      await client.query(
        `insert into public.job_skills (job_id, skill_id, weight)
         select md5($1)::uuid, s.id, case when s.slug = $2 then 3 else 2 end
         from public.skills s where s.slug = any($3::text[])
         on conflict do nothing`,
        [id, skills[0], skills],
      );
    }
    await client.query("commit");
    console.log(
      `Ensured ${companies.length} demo companies and ${jobs.length} demo jobs.`,
    );
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
