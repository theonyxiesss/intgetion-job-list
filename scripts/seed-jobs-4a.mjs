import pg from "pg";
import { isLoopback, loadLocalEnv, pgConfig } from "./db-url.mjs";

loadLocalEnv();
const url = process.env.DATABASE_MIGRATION_URL;
if (!url) throw new Error("DATABASE_MIGRATION_URL is required; seed only a local database");
if (!isLoopback(url)) throw new Error("Refusing to seed non-local database");
const client = new pg.Client(pgConfig(url));
await client.connect();
try {
  const { rows } = await client.query("select id from public.companies where status='verified' and origin='internal' order by id limit 1");
  if (!rows[0]) throw new Error("Create one local verified internal company before seeding jobs");
  await client.query(`insert into public.jobs(id,company_id,title,description,category,work_format,employment_type,application_method,application_url,status,published_at,expires_at)
    select md5('4a-seed-' || n)::uuid, $1, 'Seed remote engineer ' || n,
      'Seeded job description for performance checks. This role builds scalable web applications and collaborates with a distributed team.',
      'engineering','remote','full_time','external_url','https://example.com/jobs/' || n,'published',now() - (n || ' seconds')::interval,now() + interval '30 days'
    from generate_series(1,5000) n on conflict(id) do nothing`, [rows[0].id]);
  await client.query("analyze public.jobs");
  console.log("Ensured 5,000 local published seed jobs.");
} finally { await client.end(); }
