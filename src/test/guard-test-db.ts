// Refuses integration tests that would write to a hosted Supabase database.
// Imported as a Vitest setup file (vitest.integration.config.mts), so the
// check runs against process.env before any test file touches the database.

const HOSTED_SUFFIXES = [".supabase.co", ".supabase.com"];
const DATABASE_URL_KEYS = ["DATABASE_URL", "DATABASE_MIGRATION_URL"];

function isHostedDatabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  let hostname: string;
  try {
    hostname = new URL(value).hostname.toLowerCase();
  } catch {
    return false;
  }
  return HOSTED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export function assertLocalTestDatabase(env: NodeJS.ProcessEnv): void {
  if (env.ALLOW_HOSTED_DB_TESTS === "1") return;
  if (DATABASE_URL_KEYS.some((key) => isHostedDatabaseUrl(env[key]))) {
    throw new Error(
      "Integration tests must not run against a hosted database (set ALLOW_HOSTED_DB_TESTS=1 to override)",
    );
  }
}

assertLocalTestDatabase(process.env);
