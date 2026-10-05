#!/usr/bin/env node
/**
 * Environment variable checker for INTGETION JOB LIST
 * Usage: node scripts/check-env.mjs --mode dev|prod
 *
 * Reads variables from:
 * 1. process.env (CI, Vercel, shell)
 * 2. .env.local via loadLocalEnv() from scripts/db-url.mjs (local development)
 *
 * Never prints values or fragments of secrets. Exit code 1 if any required variable is MISSING or INVALID.
 */

import { loadLocalEnv } from "./db-url.mjs";
import { validateAll, formatResults } from "./env-rules.mjs";

// Parse --mode argument
const args = process.argv.slice(2);
let mode = "dev";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mode" && i + 1 < args.length) {
    mode = args[i + 1];
    break;
  }
}

if (mode !== "dev" && mode !== "prod") {
  console.error('Error: --mode must be "dev" or "prod"');
  process.exit(2);
}

// Load .env.local into process.env (only if not already set)
loadLocalEnv();

// Collect environment (process.env already has .env.local values after loadLocalEnv)
const env = { ...process.env };

// Validate
const { results, hasMissingRequired } = validateAll(env, mode);

// Output results (no values ever printed)
console.log(formatResults(results));
console.log(""); // blank line

// Summary
const missing = results.filter((r) => r.status === "MISSING").length;
const invalid = results.filter((r) => r.status === "INVALID").length;
const ok = results.filter(
  (r) => r.status === "OK" && !r.reason?.includes("unknown"),
).length;

console.log(`Summary: ${ok} OK, ${missing} MISSING, ${invalid} INVALID`);

if (hasMissingRequired) {
  console.log(`\n❌ Environment check FAILED (mode: ${mode})`);
  process.exit(1);
} else {
  console.log(`\n✅ Environment check PASSED (mode: ${mode})`);
  process.exit(0);
}
