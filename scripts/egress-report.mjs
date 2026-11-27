import fs from "node:fs";
import pg from "pg";
import { classifyQuery } from "./egress-classify.mjs";
import { loadLocalEnv, pgConfig, redact } from "./db-url.mjs";

// Prints the top pg_stat_statements queries by rows, labelled by delivery
// stream. --save <file> writes a JSON snapshot; --diff <file> prints the
// growth since that snapshot. Read-only: it only selects from the view.
loadLocalEnv();

const TOP = 20;
const args = process.argv.slice(2);

function flagValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${name} needs a file path.`);
    process.exit(1);
  }
  return value;
}

const savePath = flagValue("--save");
const diffPath = flagValue("--diff");

const connectionString = process.env.DATABASE_MIGRATION_URL?.trim();
if (!connectionString) {
  console.error(
    "DATABASE_MIGRATION_URL is not set. Put the schema-owner URL in .env.local or the CI environment.",
  );
  process.exit(1);
}

let previous = null;
if (diffPath) {
  try {
    previous = JSON.parse(fs.readFileSync(diffPath, "utf8"));
  } catch (error) {
    console.error(`Cannot read snapshot ${diffPath}: ${error.message}`);
    process.exit(1);
  }
}

const client = new pg.Client(pgConfig(connectionString));
client.on("error", (error) => {
  console.error(redact(error.message));
});

function shorten(sql) {
  return sql.replace(/\s+/g, " ").slice(0, 100);
}

try {
  await client.connect();
  const result = await client.query(
    "select query, calls, rows from extensions.pg_stat_statements order by rows desc limit 200",
  );
  const current = result.rows.map((row) => ({
    query: row.query,
    stream: classifyQuery(row.query),
    calls: Number(row.calls),
    rows: Number(row.rows),
  }));

  if (savePath) {
    fs.writeFileSync(
      savePath,
      JSON.stringify({ takenAt: new Date().toISOString(), queries: current }),
    );
    console.log(`Snapshot saved to ${savePath}`);
  }

  let view = current;
  if (previous) {
    const before = new Map(previous.queries.map((q) => [q.query, q]));
    view = current
      .map((q) => {
        const old = before.get(q.query);
        return {
          ...q,
          calls: q.calls - (old?.calls ?? 0),
          rows: q.rows - (old?.rows ?? 0),
        };
      })
      .filter((q) => q.rows > 0 || q.calls > 0)
      .sort((a, b) => b.rows - a.rows);
    console.log(`Growth since ${previous.takenAt}`);
  }

  const top = view.slice(0, TOP);
  for (const q of top) {
    console.log(
      `${String(q.rows).padStart(12)} rows ${String(q.calls).padStart(9)} calls  ${q.stream.padEnd(10)} ${shorten(q.query)}`,
    );
  }

  const totals = new Map();
  for (const q of view) {
    totals.set(q.stream, (totals.get(q.stream) ?? 0) + q.rows);
  }
  console.log("\nRows by stream:");
  for (const [stream, rows] of [...totals].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(rows).padStart(12)}  ${stream}`);
  }
} catch (error) {
  console.error(`egress report failed: ${redact(error.message)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
