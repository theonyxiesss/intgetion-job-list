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
    // Shape only: length and character classes, never the characters.
    const shape = [
      `length ${value.length}`,
      `starts with postgresql:// ${value.startsWith("postgresql://")}`,
      `whitespace inside ${/\s/.test(value)}`,
      `@ count ${(value.match(/@/g) ?? []).length}`,
      `non-ASCII ${/[^\x20-\x7e]/.test(value)}`,
    ].join(", ");
    return `the value is not a URL (${shape})`;
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) {
    return `unexpected scheme ${url.protocol}`;
  }
  if (!url.username || !url.password) return "user or password is missing";
  // Host, port, database and query are not secret; they show truncation.
  console.log(
    `target ${url.hostname}:${url.port || "5432"}${url.pathname}${url.search} as ${url.username.split(".")[0]}`,
  );
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
