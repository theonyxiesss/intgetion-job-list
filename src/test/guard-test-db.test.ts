import { describe, expect, it } from "vitest";

// guard-test-db checks process.env when it is imported. This unit suite can
// run on a machine whose shell exports a hosted DATABASE_URL, so the module is
// loaded with a local URL and the caller's environment is restored afterwards.
const keys = [
  "DATABASE_URL",
  "DATABASE_MIGRATION_URL",
  "ALLOW_HOSTED_DB_TESTS",
];
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
for (const key of keys) delete process.env[key];
process.env.DATABASE_URL = "postgresql://app_rw:pass@127.0.0.1:54322/postgres";
const { assertLocalTestDatabase } = await import("./guard-test-db");
for (const key of keys) {
  if (saved[key] === undefined) delete process.env[key];
  else process.env[key] = saved[key];
}

// Partial env objects; the cast keeps the tests on the typed signature.
const env = (value: Record<string, string>) => value as NodeJS.ProcessEnv;

const HOSTED_ERROR =
  "Integration tests must not run against a hosted database (set ALLOW_HOSTED_DB_TESTS=1 to override)";
const HOSTED_DIRECT =
  "postgresql://app_rw:pass@db.hwcdscobnmxatmjbmect.supabase.co:5432/postgres";

describe("assertLocalTestDatabase", () => {
  it("refuses a direct Supabase host", () => {
    expect(() =>
      assertLocalTestDatabase(env({ DATABASE_URL: HOSTED_DIRECT })),
    ).toThrow(HOSTED_ERROR);
  });

  it("refuses a Supabase pooler host", () => {
    expect(() =>
      assertLocalTestDatabase(
        env({
          DATABASE_MIGRATION_URL:
            "postgresql://postgres.hwcdscobnmxatmjbmect:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
        }),
      ),
    ).toThrow(HOSTED_ERROR);
  });

  it("accepts the local Supabase database", () => {
    expect(() =>
      assertLocalTestDatabase(
        env({
          DATABASE_URL: "postgresql://app_rw:pass@127.0.0.1:54322/postgres",
          DATABASE_MIGRATION_URL:
            "postgresql://postgres:postgres@localhost:54322/postgres",
        }),
      ),
    ).not.toThrow();
  });

  it("accepts a hosted host when ALLOW_HOSTED_DB_TESTS=1", () => {
    expect(() =>
      assertLocalTestDatabase(
        env({ DATABASE_URL: HOSTED_DIRECT, ALLOW_HOSTED_DB_TESTS: "1" }),
      ),
    ).not.toThrow();
  });

  it("ignores other values of ALLOW_HOSTED_DB_TESTS", () => {
    expect(() =>
      assertLocalTestDatabase(
        env({ DATABASE_URL: HOSTED_DIRECT, ALLOW_HOSTED_DB_TESTS: "true" }),
      ),
    ).toThrow(HOSTED_ERROR);
  });

  it("passes when no database URL is set", () => {
    expect(() => assertLocalTestDatabase(env({}))).not.toThrow();
  });
});
