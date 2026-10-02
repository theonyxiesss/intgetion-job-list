import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { isLoopback, loadLocalEnv, redact } from "./db-url.mjs";

const migrationsDir = path.join("src", "db", "migrations");
const localPassword = "app_rw_local_only";

loadLocalEnv();

const connectionString = process.env.DATABASE_MIGRATION_URL;
if (!connectionString) {
  console.error(
    "DATABASE_MIGRATION_URL is not set. Put the schema-owner URL in .env.local or the CI environment.",
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const role = await client.query(
    "SELECT 1 FROM pg_roles WHERE rolname = 'app_rw'",
  );
  if (role.rowCount === 0) {
    if (!isLoopback(connectionString)) {
      throw new Error(
        "role app_rw is missing on the hosted database. Create it in the Supabase dashboard. This script does not set a hosted password.",
      );
    }
    await client.query(`CREATE ROLE app_rw LOGIN PASSWORD '${localPassword}'`);
    console.log("created local role app_rw");
  }

  const applied = await client.query(
    "SELECT filename FROM public.schema_migrations",
  );
  const seen = new Set(applied.rows.map((row) => row.filename));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const filename of files) {
    if (seen.has(filename)) {
      console.log(`already applied: ${filename}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, filename), "utf8");
    await client.query(sql);
    await client.query(
      "INSERT INTO public.schema_migrations (filename) VALUES ($1)",
      [filename],
    );
    console.log(`applied: ${filename}`);
  }
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
