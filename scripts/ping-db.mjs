import pg from "pg";
import { loadLocalEnv, pgConfig, redact } from "./db-url.mjs";

// Keeps the free dev project from pausing after a week without activity.
// Connects as app_rw with the pinned CA (D36) and runs one trivial query.
loadLocalEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client(pgConfig(connectionString));
try {
  await client.connect();
  const result = await client.query("select now() as at");
  console.log(`dev database answered at ${result.rows[0].at.toISOString()}`);
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
