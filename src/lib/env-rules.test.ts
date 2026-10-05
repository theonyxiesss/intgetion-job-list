import { describe, it, expect } from "vitest";
import * as envRules from "../../scripts/env-rules.mjs";

describe("env-rules validation", () => {
  const baseEnv = {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    CRON_SECRET: "a".repeat(32),
    PRIVACY_HASH_SECRET: "b".repeat(32),
    UNSUBSCRIBE_SECRET: "c".repeat(32),
  };

  describe("dev mode", () => {
    it("passes with all dev-required vars set", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        baseEnv,
        "dev",
      );
      expect(hasMissingRequired).toBe(false);
      const missing = results.filter((r) => r.status === "MISSING");
      expect(missing).toHaveLength(0);
    });

    it("fails when NEXT_PUBLIC_SITE_URL is missing", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, NEXT_PUBLIC_SITE_URL: undefined },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const siteUrl = results.find((r) => r.name === "NEXT_PUBLIC_SITE_URL");
      expect(siteUrl?.status).toBe("MISSING");
    });

    it("fails when CRON_SECRET is too short", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, CRON_SECRET: "short" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const cron = results.find((r) => r.name === "CRON_SECRET");
      expect(cron?.status).toBe("INVALID");
      expect(cron?.reason).toContain("32 characters");
    });

    it("fails when UNSUBSCRIBE_SECRET is too short", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, UNSUBSCRIBE_SECRET: "short" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const unsub = results.find((r) => r.name === "UNSUBSCRIBE_SECRET");
      expect(unsub?.status).toBe("INVALID");
    });

    it("fails when PRIVACY_HASH_SECRET is too short", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, PRIVACY_HASH_SECRET: "short" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const privacy = results.find((r) => r.name === "PRIVACY_HASH_SECRET");
      expect(privacy?.status).toBe("INVALID");
    });

    it("accepts http:// for NEXT_PUBLIC_SITE_URL in dev", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
        "dev",
      );
      expect(hasMissingRequired).toBe(false);
      const siteUrl = results.find((r) => r.name === "NEXT_PUBLIC_SITE_URL");
      expect(siteUrl?.status).toBe("OK");
    });

    it("accepts https:// for NEXT_PUBLIC_SITE_URL in dev", () => {
      const { results } = envRules.validateAll(
        { ...baseEnv, NEXT_PUBLIC_SITE_URL: "https://dev.example.com" },
        "dev",
      );
      const siteUrl = results.find((r) => r.name === "NEXT_PUBLIC_SITE_URL");
      expect(siteUrl?.status).toBe("OK");
    });

    it("rejects invalid URL for NEXT_PUBLIC_SITE_URL", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, NEXT_PUBLIC_SITE_URL: "not-a-url" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const siteUrl = results.find((r) => r.name === "NEXT_PUBLIC_SITE_URL");
      expect(siteUrl?.status).toBe("INVALID");
    });

    it("validates DATABASE_URL as postgres://", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, DATABASE_URL: "postgresql://user:pass@host:5432/db" },
        "dev",
      );
      expect(hasMissingRequired).toBe(false);
      const db = results.find((r) => r.name === "DATABASE_URL");
      expect(db?.status).toBe("OK");
    });

    it("rejects non-postgres DATABASE_URL", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, DATABASE_URL: "mysql://user:pass@host:3306/db" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const db = results.find((r) => r.name === "DATABASE_URL");
      expect(db?.status).toBe("INVALID");
    });

    it("validates EMBEDDINGS_ENABLED as boolean string", () => {
      const { results } = envRules.validateAll(
        { ...baseEnv, EMBEDDINGS_ENABLED: "true" },
        "dev",
      );
      const emb = results.find((r) => r.name === "EMBEDDINGS_ENABLED");
      expect(emb?.status).toBe("OK");
    });

    it("rejects non-boolean EMBEDDINGS_ENABLED", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, EMBEDDINGS_ENABLED: "yes" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const emb = results.find((r) => r.name === "EMBEDDINGS_ENABLED");
      expect(emb?.status).toBe("INVALID");
    });

    it("validates LLM_DAILY_BUDGET_USD as positive number", () => {
      const { results } = envRules.validateAll(
        { ...baseEnv, LLM_DAILY_BUDGET_USD: "20" },
        "dev",
      );
      const budget = results.find((r) => r.name === "LLM_DAILY_BUDGET_USD");
      expect(budget?.status).toBe("OK");
    });

    it("rejects zero LLM_DAILY_BUDGET_USD", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, LLM_DAILY_BUDGET_USD: "0" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const budget = results.find((r) => r.name === "LLM_DAILY_BUDGET_USD");
      expect(budget?.status).toBe("INVALID");
    });

    it("rejects negative LLM_DAILY_BUDGET_USD", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, LLM_DAILY_BUDGET_USD: "-5" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const budget = results.find((r) => r.name === "LLM_DAILY_BUDGET_USD");
      expect(budget?.status).toBe("INVALID");
    });

    it("rejects non-numeric LLM_DAILY_BUDGET_USD", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, LLM_DAILY_BUDGET_USD: "abc" },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const budget = results.find((r) => r.name === "LLM_DAILY_BUDGET_USD");
      expect(budget?.status).toBe("INVALID");
    });

    it("RESEND_API_KEY and EMAIL_FROM both missing = OK in dev (optional)", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, RESEND_API_KEY: undefined, EMAIL_FROM: undefined },
        "dev",
      );
      expect(hasMissingRequired).toBe(false);
      const resend = results.find((r) => r.name === "RESEND_API_KEY");
      const email = results.find((r) => r.name === "EMAIL_FROM");
      expect(resend?.status).toBe("OK");
      expect(email?.status).toBe("OK");
    });
  });

  describe("prod mode", () => {
    const prodBaseEnv = {
      ...baseEnv,
      NEXT_PUBLIC_SITE_URL: "https://example.com",
      DATABASE_MIGRATION_URL: "postgresql://migrator:pass@host:5432/db",
      RESEND_API_KEY: "resend-example",
      EMAIL_FROM: "noreply@example.com",
      ANTHROPIC_API_KEY: "anthropic-example",
      SENTRY_DSN: "https://sentry.io/123",
      LLM_DAILY_BUDGET_USD: "20",
      EMBEDDINGS_ENABLED: "false",
      IMPORT_LIVE_ENABLED: "false",
    };

    it("passes with all prod-required vars set", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        prodBaseEnv,
        "prod",
      );
      expect(hasMissingRequired).toBe(false);
      const missing = results.filter((r) => r.status === "MISSING");
      expect(missing).toHaveLength(0);
    });

    it("requires DATABASE_MIGRATION_URL in prod", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...prodBaseEnv, DATABASE_MIGRATION_URL: undefined },
        "prod",
      );
      expect(hasMissingRequired).toBe(true);
      const dbMig = results.find((r) => r.name === "DATABASE_MIGRATION_URL");
      expect(dbMig?.status).toBe("MISSING");
    });

    it("requires RESEND_API_KEY in prod", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...prodBaseEnv, RESEND_API_KEY: undefined },
        "prod",
      );
      expect(hasMissingRequired).toBe(true);
      const resend = results.find((r) => r.name === "RESEND_API_KEY");
      expect(resend?.status).toBe("MISSING");
    });

    it("requires EMAIL_FROM in prod", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...prodBaseEnv, EMAIL_FROM: undefined },
        "prod",
      );
      expect(hasMissingRequired).toBe(true);
      const email = results.find((r) => r.name === "EMAIL_FROM");
      expect(email?.status).toBe("MISSING");
    });

    it("requires ANTHROPIC_API_KEY in prod", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...prodBaseEnv, ANTHROPIC_API_KEY: undefined },
        "prod",
      );
      expect(hasMissingRequired).toBe(true);
      const anthropic = results.find((r) => r.name === "ANTHROPIC_API_KEY");
      expect(anthropic?.status).toBe("MISSING");
    });

    it("requires SENTRY_DSN in prod", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...prodBaseEnv, SENTRY_DSN: undefined },
        "prod",
      );
      expect(hasMissingRequired).toBe(true);
      const sentry = results.find((r) => r.name === "SENTRY_DSN");
      expect(sentry?.status).toBe("MISSING");
    });

    it("rejects http:// for NEXT_PUBLIC_SITE_URL in prod", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...prodBaseEnv, NEXT_PUBLIC_SITE_URL: "http://example.com" },
        "prod",
      );
      expect(hasMissingRequired).toBe(true);
      const siteUrl = results.find((r) => r.name === "NEXT_PUBLIC_SITE_URL");
      expect(siteUrl?.status).toBe("INVALID");
      expect(siteUrl?.reason).toContain("https");
    });

    it("accepts https:// for NEXT_PUBLIC_SITE_URL in prod", () => {
      const { results } = envRules.validateAll(
        { ...prodBaseEnv, NEXT_PUBLIC_SITE_URL: "https://example.com" },
        "prod",
      );
      const siteUrl = results.find((r) => r.name === "NEXT_PUBLIC_SITE_URL");
      expect(siteUrl?.status).toBe("OK");
    });

    it("validates SENTRY_DSN as https URL", () => {
      const { results } = envRules.validateAll(
        { ...prodBaseEnv, SENTRY_DSN: "https://sentry.io/123" },
        "prod",
      );
      const sentry = results.find((r) => r.name === "SENTRY_DSN");
      expect(sentry?.status).toBe("OK");
    });

    it("rejects non-https SENTRY_DSN", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...prodBaseEnv, SENTRY_DSN: "http://sentry.io/123" },
        "prod",
      );
      expect(hasMissingRequired).toBe(true);
      const sentry = results.find((r) => r.name === "SENTRY_DSN");
      expect(sentry?.status).toBe("INVALID");
    });
  });

  describe("RESEND_API_KEY + EMAIL_FROM pair validation", () => {
    it("fails when only RESEND_API_KEY is set", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, RESEND_API_KEY: "resend-example", EMAIL_FROM: undefined },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const resend = results.find((r) => r.name === "RESEND_API_KEY");
      const email = results.find((r) => r.name === "EMAIL_FROM");
      expect(resend?.status).toBe("INVALID");
      expect(email?.status).toBe("INVALID");
      expect(resend?.reason).toContain("vice versa");
    });

    it("fails when only EMAIL_FROM is set", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        {
          ...baseEnv,
          RESEND_API_KEY: undefined,
          EMAIL_FROM: "test@example.com",
        },
        "dev",
      );
      expect(hasMissingRequired).toBe(true);
      const resend = results.find((r) => r.name === "RESEND_API_KEY");
      const email = results.find((r) => r.name === "EMAIL_FROM");
      expect(resend?.status).toBe("INVALID");
      expect(email?.status).toBe("INVALID");
    });

    it("passes when both are set", () => {
      const { results, hasMissingRequired } = envRules.validateAll(
        {
          ...baseEnv,
          RESEND_API_KEY: "resend-example",
          EMAIL_FROM: "test@example.com",
        },
        "dev",
      );
      expect(hasMissingRequired).toBe(false);
      const resend = results.find((r) => r.name === "RESEND_API_KEY");
      const email = results.find((r) => r.name === "EMAIL_FROM");
      expect(resend?.status).toBe("OK");
      expect(email?.status).toBe("OK");
    });

    it("passes when both are missing (optional in dev)", () => {
      const { hasMissingRequired } = envRules.validateAll(
        { ...baseEnv, RESEND_API_KEY: undefined, EMAIL_FROM: undefined },
        "dev",
      );
      expect(hasMissingRequired).toBe(false);
    });
  });

  describe("secret values never appear in output", () => {
    it("formatResults does not contain secret values", () => {
      const results = [
        { name: "CRON_SECRET", status: "OK" as const },
        {
          name: "CRON_SECRET",
          status: "INVALID" as const,
          reason: "must be at least 32 characters",
        },
        {
          name: "UNSUBSCRIBE_SECRET",
          status: "MISSING" as const,
          reason: "required but not set",
        },
        { name: "PRIVACY_HASH_SECRET", status: "OK" as const },
      ];
      const output = envRules.formatResults(results);
      // Should not contain any actual secret values
      expect(output).not.toContain("a".repeat(32));
      expect(output).not.toContain("b".repeat(32));
      expect(output).not.toContain("c".repeat(32));
      // Should contain statuses
      expect(output).toContain("OK");
      expect(output).toContain("INVALID");
      expect(output).toContain("MISSING");
      // Should contain reasons
      expect(output).toContain("32 characters");
      expect(output).toContain("required but not set");
    });

    it("validateVar never returns value in reason", () => {
      const result = envRules.validateVar(
        "CRON_SECRET",
        "actual-secret-value-here",
        "dev",
      );
      expect(result.reason).not.toContain("actual-secret-value-here");
      expect(result.reason).not.toContain("secret");
    });

    it("validateAll never includes values in results", () => {
      const env = {
        ...baseEnv,
        CRON_SECRET: "my-real-secret-key-123456789012",
      };
      const { results } = envRules.validateAll(env, "dev");
      const cronResult = results.find((r) => r.name === "CRON_SECRET");
      expect(JSON.stringify(cronResult)).not.toContain("my-real-secret");
    });
  });

  describe("unknown variables", () => {
    it("unknown variables are ignored (OK with reason)", () => {
      const { results } = envRules.validateAll(
        { ...baseEnv, SOME_UNKNOWN_VAR: "value" },
        "dev",
      );
      const unknown = results.find((r) => r.name === "SOME_UNKNOWN_VAR");
      expect(unknown).toBeDefined();
      expect(unknown?.status).toBe("OK");
      expect(unknown?.reason).toContain("unknown");
    });

    it("npm_ and NODE_ prefixed vars are ignored", () => {
      const { results } = envRules.validateAll(
        { ...baseEnv, npm_config_loglevel: "info", NODE_ENV: "test" },
        "dev",
      );
      const npmVar = results.find((r) => r.name === "npm_config_loglevel");
      const nodeVar = results.find((r) => r.name === "NODE_ENV");
      // They should not appear in results (filtered out in validateAll)
      expect(npmVar).toBeUndefined();
      expect(nodeVar).toBeUndefined();
    });
  });

  describe("sorting order", () => {
    it("required vars come first, then optional, alphabetically", () => {
      const { results } = envRules.validateAll(baseEnv, "dev");
      const requiredNames = results
        .filter((r) => envRules.DEV_REQUIRED.has(r.name))
        .map((r) => r.name);
      const optionalNames = results
        .filter(
          (r) =>
            !envRules.DEV_REQUIRED.has(r.name) &&
            !r.reason?.includes("unknown"),
        )
        .map((r) => r.name);

      // Required should be alphabetically sorted
      expect(requiredNames).toEqual([...requiredNames].sort());
      // Optional should be alphabetically sorted
      expect(optionalNames).toEqual([...optionalNames].sort());
      // All required should come before optional
      const firstOptionalIndex = results.findIndex(
        (r) =>
          !envRules.DEV_REQUIRED.has(r.name) && !r.reason?.includes("unknown"),
      );
      const lastRequiredIndex = results.findLastIndex((r) =>
        envRules.DEV_REQUIRED.has(r.name),
      );
      expect(lastRequiredIndex).toBeLessThan(firstOptionalIndex);
    });
  });
});
