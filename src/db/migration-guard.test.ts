import { afterEach, describe, expect, it } from "vitest";
import { decideMigrationTarget, isLoopback } from "../../scripts/db-url.mjs";

const password = "pass";
const remote = `postgresql://migrator:${password}@db.example.test:5432/postgres`;
const known = ["db.dev.internal"];

function decision(
  connectionString: string,
  argv: string[] = [],
  knownNonProductionHosts?: string[],
) {
  return decideMigrationTarget(connectionString, argv, {
    knownNonProductionHosts,
  });
}

describe("migration target guard", () => {
  const previousAllow = process.env.ALLOW_REMOTE;
  const previousConfirm = process.env.CONFIRM_HOST;

  afterEach(() => {
    if (previousAllow === undefined) delete process.env.ALLOW_REMOTE;
    else process.env.ALLOW_REMOTE = previousAllow;
    if (previousConfirm === undefined) delete process.env.CONFIRM_HOST;
    else process.env.CONFIRM_HOST = previousConfirm;
  });

  it("treats loopback and localhost as local", () => {
    for (const host of [
      "localhost",
      "LOCALHOST",
      "127.0.0.1",
      "127.0.0.2",
      "127.255.255.255",
      "[::1]",
      "[::ffff:127.0.0.1]",
    ]) {
      const url = `postgresql://migrator:${password}@${host}:5432/postgres`;
      expect(isLoopback(url)).toBe(true);
      expect(decision(url).ok).toBe(true);
      expect(decision(url).code).toBe("local");
    }
  });

  it("does not treat a localhost substring as local", () => {
    const urls = [
      `postgresql://migrator:localhost@203.0.113.5:5432/postgres`,
      `postgresql://localhost@db.example.test:5432/postgres`,
      `postgresql://migrator:${password}@localhost.example.test:5432/postgres`,
      `postgresql://migrator:${password}@127.0.0.1.nip.io:5432/postgres`,
      `postgresql://migrator:${password}@127.0.0.01:5432/postgres`,
    ];
    for (const url of urls) {
      expect(isLoopback(url)).toBe(false);
      const result = decision(url);
      expect(result.ok).toBe(false);
      expect(result.code).toBe("unconfirmed");
      expect(result.reason).not.toContain(password);
      expect(result.reason).not.toMatch(/postgres(?:ql)?:\/\//i);
    }
  });

  it("ignores a casual flag and an environment variable", () => {
    process.env.ALLOW_REMOTE = "1";
    process.env.CONFIRM_HOST = "db.example.test";
    expect(decision(remote).code).toBe("unconfirmed");
    expect(decision(remote, ["--cloud"]).code).toBe("unconfirmed");
    expect(decision(remote, ["--allow-remote"]).code).toBe("unconfirmed");
    expect(
      decision(remote, ["--allow-remote", "--confirm-host", "localhost"]).code,
    ).toBe("unconfirmed");
    expect(decision(remote, ["--confirm-host", "db.example.test"]).code).toBe(
      "unconfirmed",
    );
  });

  it("refuses production and unknown hosts even after both confirmations", () => {
    const argv = ["--allow-remote", "--confirm-host", "db.example.test"];
    const unknown = decision(remote, argv, known);
    expect(unknown.ok).toBe(false);
    expect(unknown.code).toBe("unknown");
    expect(unknown.reason).not.toContain(password);

    const cloud = `postgresql://migrator:${password}@db.example.supabase.co:5432/postgres`;
    const production = decision(
      cloud,
      ["--allow-remote", "--confirm-host", "db.example.supabase.co"],
      ["db.example.supabase.co"],
    );
    expect(production.ok).toBe(false);
    expect(production.code).toBe("production");
    expect(production.reason).not.toContain(password);

    const pooler = `postgresql://migrator:${password}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`;
    expect(
      decision(pooler, [
        "--allow-remote",
        "--confirm-host",
        "aws-1-eu-central-1.pooler.supabase.com",
      ]).code,
    ).toBe("production");
  });

  it("allows a known non-production host only when the flag and host match", () => {
    const url = `postgresql://migrator:${password}@db.dev.internal:5432/postgres`;
    expect(
      decision(url, ["--allow-remote", "--confirm-host", "db.dev.internal"])
        .code,
    ).toBe("unknown");
    expect(decision(url, ["--allow-remote"], known).code).toBe("unconfirmed");
    const allowed = decision(
      url,
      ["--allow-remote", "--confirm-host", "DB.Dev.Internal"],
      known,
    );
    expect(allowed.ok).toBe(true);
    expect(allowed.code).toBe("remote");
    expect(allowed.reason).toBeUndefined();
  });

  it("refuses a URL that cannot be parsed", () => {
    const result = decision("not a url");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("invalid_url");
    expect(result.reason).not.toContain("not a url");
  });
});
