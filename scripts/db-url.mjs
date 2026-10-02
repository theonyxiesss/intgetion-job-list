import fs from "node:fs";

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

export function isLoopback(connectionString) {
  const hostname = new URL(connectionString).hostname;
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

export function pgConfig(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return {
    connectionString: url.toString(),
    ssl: isLoopback(connectionString)
      ? undefined
      : { rejectUnauthorized: false },
  };
}
