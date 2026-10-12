import fs from "node:fs";
import net from "node:net";

export function redact(value) {
  return String(value).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]");
}

export function loadLocalEnv() {
  const path = ".env.local";
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] !== undefined) continue;
    const raw = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    process.env[key] = raw;
  }
}

const loopback = new net.BlockList();
loopback.addSubnet("127.0.0.0", 8, "ipv4");
loopback.addAddress("::1", "ipv6");

/** Hostname only: no userinfo, no substring search of the whole URL. */
export function databaseHost(connectionString) {
  return normalizeHost(new URL(connectionString).hostname);
}

function normalizeHost(hostname) {
  return String(hostname)
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^\[|\]$/g, "");
}

/**
 * Local means the parsed host is localhost or a loopback address.
 * `localhost` inside a password, user, or a longer name is not local.
 * Leading-zero spellings such as `127.0.0.01` are not valid IPs here.
 */
export function isLocalDatabaseHost(hostname) {
  const host = normalizeHost(hostname);
  if (host === "localhost") return true;
  const version = net.isIP(host);
  if (version === 4) return loopback.check(host, "ipv4");
  if (version === 6) return loopback.check(host, "ipv6");
  return false;
}

export function isLoopback(connectionString) {
  return isLocalDatabaseHost(new URL(connectionString).hostname);
}

function isProductionDatabaseHost(hostname) {
  const host = normalizeHost(hostname);
  return (
    host === "supabase.co" ||
    host.endsWith(".supabase.co") ||
    host === "supabase.com" ||
    host.endsWith(".supabase.com")
  );
}

function flagValue(argv, name) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name) {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) return next;
      return undefined;
    }
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return undefined;
}

/**
 * Local migrate is allowed. A remote host needs both --allow-remote and
 * --confirm-host equal to that host. Production and unknown hosts are
 * still refused. Environment variables are ignored. The known
 * non-production list is empty, so this script does not migrate a cloud.
 */
export function decideMigrationTarget(
  connectionString,
  argv = [],
  options = {},
) {
  let host;
  try {
    host = databaseHost(connectionString);
  } catch {
    return {
      ok: false,
      code: "invalid_url",
      reason:
        "Refusing migration: DATABASE_MIGRATION_URL is not a valid database URL.",
    };
  }
  if (isLocalDatabaseHost(host)) {
    return { ok: true, code: "local", host };
  }
  const args = Array.isArray(argv) ? argv.map(String) : [];
  const allowed = args.includes("--allow-remote");
  const confirm = flagValue(args, "--confirm-host");
  if (!allowed || normalizeHost(confirm ?? "") !== host) {
    return {
      ok: false,
      code: "unconfirmed",
      host,
      reason: `Refusing migration: remote host ${host} needs --allow-remote and --confirm-host ${host}. An environment variable does not allow it.`,
    };
  }
  if (isProductionDatabaseHost(host)) {
    return {
      ok: false,
      code: "production",
      host,
      reason: `Refusing migration: ${host} is a production database host.`,
    };
  }
  const known = (options.knownNonProductionHosts ?? []).map(normalizeHost);
  if (!known.includes(host)) {
    return {
      ok: false,
      code: "unknown",
      host,
      reason: `Refusing migration: ${host} is not a known non-production database host.`,
    };
  }
  return { ok: true, code: "remote", host };
}

// Supabase Root 2021 CA. src/db/ssl.ts embeds the same bytes for the app.
const supabaseRootCa = fs.readFileSync(
  new URL("../src/db/supabase-root-2021-ca.pem", import.meta.url),
  "utf8",
);

export function pgConfig(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return {
    connectionString: url.toString(),
    ssl: isLoopback(connectionString)
      ? undefined
      : { ca: supabaseRootCa, rejectUnauthorized: true },
  };
}
