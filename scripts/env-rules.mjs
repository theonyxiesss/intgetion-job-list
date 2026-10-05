/**
 * Environment validation rules — pure functions, no side effects, no value logging.
 * Used by scripts/check-env.mjs and unit tests.
 *
 * Rules derived from:
 * - .env.example (18 variables)
 * - TZ_INTGETION_v6.md sections 3.6, 16, 17
 * - src/lib/rate-limit.ts (privacyHash secret)
 * - src/modules/notifications/service/email-sender.ts (RESEND_API_KEY + EMAIL_FROM pair)
 * - All cron routes (CRON_SECRET required, else 404)
 * - src/lib/supabase/admin.ts (SUPABASE_SERVICE_ROLE_KEY for Auth Admin API)
 */

// Dev-required: needed for local development (pnpm dev, bot, auth)
// Prod-required: needed for production deployment on Vercel
const DEV_REQUIRED = new Set([
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "CRON_SECRET",
  "PRIVACY_HASH_SECRET",
  "UNSUBSCRIBE_SECRET",
]);

const PROD_REQUIRED = new Set([
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DATABASE_MIGRATION_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "ANTHROPIC_API_KEY",
  "CRON_SECRET",
  "PRIVACY_HASH_SECRET",
  "UNSUBSCRIBE_SECRET",
  "SENTRY_DSN",
]);

// All known variables (for unknown-variable warning)
const ALL_KNOWN = new Set([
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DATABASE_MIGRATION_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "UNSUBSCRIBE_SECRET",
  "ANTHROPIC_API_KEY",
  "LLM_MODEL_CHAT",
  "LLM_MODEL_EXTRACT",
  "LLM_DAILY_BUDGET_USD",
  "EMBEDDINGS_ENABLED",
  "IMPORT_LIVE_ENABLED",
  "INDEXNOW_KEY",
  "CRON_SECRET",
  "PRIVACY_HASH_SECRET",
  "SENTRY_DSN",
]);

/**
 * Check if a string is a valid URL (http/https or postgres://)
 * @param {string} value
 * @param {string[]} allowedProtocols - e.g. ['http:', 'https:'] or ['postgres:', 'postgresql:']
 * @returns {boolean}
 */
function isValidUrl(value, allowedProtocols) {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value);
    return allowedProtocols.includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid positive number (for LLM_DAILY_BUDGET_USD)
 * @param {string} value
 * @returns {boolean}
 */
function isPositiveNumber(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed === "") return false;
  const num = Number(trimmed);
  return Number.isFinite(num) && num > 0;
}

/**
 * Check if secret meets minimum length (32 chars)
 * @param {string} value
 * @returns {boolean}
 */
function isSecretLongEnough(value) {
  return typeof value === "string" && value.trim().length >= 32;
}

/**
 * Check if value is 'true' or 'false' (for boolean env vars)
 * @param {string} value
 * @returns {boolean}
 */
function isBooleanString(value) {
  return value === "true" || value === "false";
}

/**
 * Validate a single environment variable
 * @param {string} name
 * @param {string|undefined} value
 * @param {'dev'|'prod'} mode
 * @returns {{name: string, status: 'OK'|'MISSING'|'INVALID', reason?: string}}
 */
function validateVar(name, value, mode) {
  const required = mode === "dev" ? DEV_REQUIRED : PROD_REQUIRED;
  const isRequired = required.has(name);

  // Missing
  if (value === undefined || value === null || value.trim() === "") {
    if (isRequired) {
      return { name, status: "MISSING", reason: "required but not set" };
    }
    return { name, status: "OK" }; // optional and not set = OK
  }

  const trimmed = value.trim();

  // Format validations per variable
  switch (name) {
    case "NEXT_PUBLIC_SITE_URL":
      if (mode === "prod" && !isValidUrl(trimmed, ["https:"])) {
        return {
          name,
          status: "INVALID",
          reason: "must be https:// URL in prod",
        };
      }
      if (mode === "dev" && !isValidUrl(trimmed, ["http:", "https:"])) {
        return {
          name,
          status: "INVALID",
          reason: "must be http:// or https:// URL",
        };
      }
      break;

    case "NEXT_PUBLIC_SUPABASE_URL":
    case "SUPABASE_SERVICE_ROLE_KEY":
      // Supabase URL format validated by Supabase client; just check non-empty
      break;

    case "DATABASE_URL":
      if (!isValidUrl(trimmed, ["postgres:", "postgresql:"])) {
        return {
          name,
          status: "INVALID",
          reason: "must be postgres:// or postgresql:// URL",
        };
      }
      break;

    case "DATABASE_MIGRATION_URL":
      if (!isValidUrl(trimmed, ["postgres:", "postgresql:"])) {
        return {
          name,
          status: "INVALID",
          reason: "must be postgres:// or postgresql:// URL",
        };
      }
      break;

    case "RESEND_API_KEY":
      // Paired with EMAIL_FROM - validated together below
      break;

    case "EMAIL_FROM":
      // Paired with RESEND_API_KEY
      break;

    case "ANTHROPIC_API_KEY":
      if (trimmed.length < 10) {
        return {
          name,
          status: "INVALID",
          reason: "too short for Anthropic API key",
        };
      }
      break;

    case "LLM_MODEL_CHAT":
    case "LLM_MODEL_EXTRACT":
      // Model names - no strict format, just non-empty
      break;

    case "LLM_DAILY_BUDGET_USD":
      if (!isPositiveNumber(trimmed)) {
        return { name, status: "INVALID", reason: "must be a number > 0" };
      }
      break;

    case "EMBEDDINGS_ENABLED":
    case "IMPORT_LIVE_ENABLED":
      if (!isBooleanString(trimmed)) {
        return { name, status: "INVALID", reason: 'must be "true" or "false"' };
      }
      break;

    case "CRON_SECRET":
    case "UNSUBSCRIBE_SECRET":
    case "PRIVACY_HASH_SECRET":
      if (!isSecretLongEnough(trimmed)) {
        return {
          name,
          status: "INVALID",
          reason: "must be at least 32 characters",
        };
      }
      break;

    case "SENTRY_DSN":
      if (!isValidUrl(trimmed, ["https:"])) {
        return { name, status: "INVALID", reason: "must be https:// DSN" };
      }
      break;

    default:
      // Unknown variable - not an error, but could warn
      break;
  }

  // Cross-variable validation: RESEND_API_KEY and EMAIL_FROM must be both set or both empty
  if (name === "RESEND_API_KEY" || name === "EMAIL_FROM") {
    // This will be checked in validateAll after all vars are collected
  }

  return { name, status: "OK" };
}

/**
 * Validate all environment variables
 * @param {Record<string, string|undefined>} env - process.env + loaded .env.local
 * @param {'dev'|'prod'} mode
 * @returns {{results: Array<{name: string, status: 'OK'|'MISSING'|'INVALID', reason?: string}>, hasMissingRequired: boolean}}
 */
function validateAll(env, mode) {
  const results = [];
  let hasMissingRequired = false;

  // Validate known variables
  for (const name of ALL_KNOWN) {
    const result = validateVar(name, env[name], mode);
    results.push(result);
    if (result.status === "MISSING" || result.status === "INVALID")
      hasMissingRequired = true;
  }

  // Cross-variable: RESEND_API_KEY + EMAIL_FROM pair
  const resendKey = env.RESEND_API_KEY?.trim();
  const emailFrom = env.EMAIL_FROM?.trim();
  const resendResult = results.find((r) => r.name === "RESEND_API_KEY");
  const emailResult = results.find((r) => r.name === "EMAIL_FROM");

  if ((resendKey && !emailFrom) || (!resendKey && emailFrom)) {
    // One is set, the other not - both become INVALID
    if (resendResult && resendResult.status === "OK") {
      resendResult.status = "INVALID";
      resendResult.reason = "RESEND_API_KEY requires EMAIL_FROM and vice versa";
    }
    if (emailResult && emailResult.status === "OK") {
      emailResult.status = "INVALID";
      emailResult.reason = "EMAIL_FROM requires RESEND_API_KEY and vice versa";
    }
    hasMissingRequired = true; // treat as missing required for exit code
  }

  // Warn about unknown variables (not in ALL_KNOWN)
  for (const name of Object.keys(env)) {
    if (
      !ALL_KNOWN.has(name) &&
      !name.startsWith("npm_") &&
      !name.startsWith("NODE_")
    ) {
      results.push({
        name,
        status: "OK",
        reason: "unknown variable (ignored)",
      });
    }
  }

  // Sort: required first, then optional, alphabetically within each group
  const requiredSet = mode === "dev" ? DEV_REQUIRED : PROD_REQUIRED;
  results.sort((a, b) => {
    const aReq = requiredSet.has(a.name) ? 0 : 1;
    const bReq = requiredSet.has(b.name) ? 0 : 1;
    if (aReq !== bReq) return aReq - bReq;
    return a.name.localeCompare(b.name);
  });

  return { results, hasMissingRequired };
}

/**
 * Format results for console output (no values ever printed)
 * @param {Array<{name: string, status: 'OK'|'MISSING'|'INVALID', reason?: string}>} results
 * @returns {string}
 */
function formatResults(results) {
  const lines = [];
  for (const r of results) {
    if (r.status === "OK" && r.reason?.includes("unknown")) continue; // skip unknown vars in output
    const suffix = r.reason ? ` (${r.reason})` : "";
    lines.push(`${r.name}: ${r.status}${suffix}`);
  }
  return lines.join("\n");
}

export {
  validateVar,
  validateAll,
  formatResults,
  DEV_REQUIRED,
  PROD_REQUIRED,
  ALL_KNOWN,
  isValidUrl,
  isPositiveNumber,
  isSecretLongEnough,
  isBooleanString,
};
