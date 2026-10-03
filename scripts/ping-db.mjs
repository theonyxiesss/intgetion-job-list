import pg from "pg";
import { loadLocalEnv, pgConfig, redact } from "./db-url.mjs";

// Keeps the free dev project from pausing after a week without activity.
// Connects as app_rw with the pinned CA (D36) and runs one trivial query.
loadLocalEnv();

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// Says what is wrong with the value without printing it.
function describeUrlProblem(value) {
  if (/^["']|["']$/.test(value)) return "the value is wrapped in quotes";
  if (value.startsWith("DATABASE_URL=")) {
    return "the value includes the DATABASE_URL= prefix";
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return "the value is not a URL";
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) {
    return `unexpected scheme ${url.protocol}`;
  }
  if (!url.username || !url.password) return "user or password is missing";
  return null;
}

const problem = describeUrlProblem(connectionString);
if (problem) {
  console.error(`DATABASE_URL is malformed: ${problem}.`);
  process.exit(1);
}

const client = new pg.Client(pgConfig(connectionString));
try {
  await client.connect();
  const result = await client.query("select now() as at");
  console.log(`dev database answered at ${result.rows[0].at.toISOString()}`);
} catch (error) {
  const inner = error instanceof AggregateError ? error.errors : [error];
  for (const item of inner) {
    const name = item instanceof Error ? item.name : typeof item;
    const code =
      item && typeof item === "object" && "code" in item ? item.code : "";
    const message = item instanceof Error ? redact(item.message) : "";
    console.error(`ping failed: ${name} ${code} ${message}`.trim());
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
