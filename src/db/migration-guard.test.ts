import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  decideMigrationTarget,
  isLoopback,
  requireDatabaseTarget,
} from "../../scripts/db-url.mjs";

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

const pooler = `postgresql://migrator:${password}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`;
const local = `postgresql://migrator:${password}@127.0.0.1:54322/postgres`;

function openIfAllowed(connectionString: string, argv: string[] = []) {
  requireDatabaseTarget(connectionString, argv);
  return "connected";
}

describe("verify and grant use the migrate host check before connect", () => {
  it("allows loopback and does not echo the password", () => {
    const target = requireDatabaseTarget(local, []);
    expect(target.ok).toBe(true);
    expect(target.code).toBe("local");
    expect(JSON.stringify(target)).not.toContain(password);
  });

  it("refuses the pooler before connect when flags are missing", () => {
    const opened: string[] = [];
    expect(() => {
      opened.push(openIfAllowed(pooler));
    }).toThrow(/needs --allow-remote/);
    expect(opened).toEqual([]);
  });

  it("refuses the pooler when only --allow-remote is set", () => {
    expect(() => openIfAllowed(pooler, ["--allow-remote"])).toThrow(
      /needs --allow-remote/,
    );
  });

  it("still refuses a supabase host after both confirmations", () => {
    expect(() =>
      openIfAllowed(pooler, [
        "--allow-remote",
        "--confirm-host",
        "aws-1-eu-central-1.pooler.supabase.com",
      ]),
    ).toThrow(/production database host/);
  });

  it("refuses an unknown host after both confirmations", () => {
    expect(() =>
      openIfAllowed(remote, [
        "--allow-remote",
        "--confirm-host",
        "db.example.test",
      ]),
    ).toThrow(/not a known non-production/);
  });

  it("ignores ALLOW_REMOTE and CONFIRM_HOST in the environment", () => {
    const previousAllow = process.env.ALLOW_REMOTE;
    const previousConfirm = process.env.CONFIRM_HOST;
    process.env.ALLOW_REMOTE = "1";
    process.env.CONFIRM_HOST = "aws-1-eu-central-1.pooler.supabase.com";
    try {
      expect(() => openIfAllowed(pooler, [])).toThrow(/environment variable/);
    } finally {
      if (previousAllow === undefined) delete process.env.ALLOW_REMOTE;
      else process.env.ALLOW_REMOTE = previousAllow;
      if (previousConfirm === undefined) delete process.env.CONFIRM_HOST;
      else process.env.CONFIRM_HOST = previousConfirm;
    }
  });

  it("does not treat a lookalike host as loopback", () => {
    for (const host of ["localhost.supabase.com", "127.0.0.1.example"]) {
      const url = `postgresql://migrator:${password}@${host}:5432/postgres`;
      expect(isLoopback(url)).toBe(false);
      expect(() => openIfAllowed(url)).toThrow(/needs --allow-remote/);
    }
  });

  it("refuses an invalid URL without echoing it", () => {
    const secret = "not a url secret-token";
    expect(() => openIfAllowed(secret)).toThrow(/not a valid database URL/);
    try {
      openIfAllowed(secret);
    } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).not.toContain(password);
    }
  });

  it("opens a local migration URL and refuses a pooler app URL before the second connect", () => {
    const opened: string[] = [];
    opened.push(openIfAllowed(local));
    expect(() => {
      opened.push(openIfAllowed(pooler));
    }).toThrow(/production|needs --allow-remote/);
    expect(opened).toEqual(["connected"]);
  });

  it("refuses a grant on the pooler before connect when the email is valid", () => {
    const argv = ["owner@example.com", "owner", "--allow-remote"];
    const opened: string[] = [];
    expect(argv[0]).toContain("@");
    expect(() => {
      requireDatabaseTarget(pooler, argv);
      opened.push("begin");
    }).toThrow(/needs --allow-remote/);
    expect(opened).toEqual([]);
  });

  it("checks verify-db and grant-admin before each client", () => {
    const verify = readFileSync("scripts/verify-db.mjs", "utf8");
    const verifyGuards = [...verify.matchAll(/requireDatabaseTarget\(/g)];
    const verifyClients = [...verify.matchAll(/new pg\.Client/g)];
    expect(verifyGuards).toHaveLength(2);
    expect(verifyClients).toHaveLength(2);
    expect(verifyGuards[0]?.index).toBeLessThan(verifyClients[0]?.index ?? -1);
    expect(verifyGuards[1]?.index ?? -1).toBeLessThan(
      verifyClients[1]?.index ?? -1,
    );
    expect(verifyGuards[1]?.index ?? -1).toBeGreaterThan(
      verifyClients[0]?.index ?? Number.POSITIVE_INFINITY,
    );

    const grant = readFileSync("scripts/grant-admin.mjs", "utf8");
    const usage = grant.indexOf("Usage: pnpm admin:grant");
    const guard = grant.indexOf("requireDatabaseTarget(");
    const client = grant.indexOf("new pg.Client");
    const begin = grant.indexOf('query("BEGIN")');
    expect(usage).toBeGreaterThanOrEqual(0);
    expect(usage).toBeLessThan(guard);
    expect(guard).toBeLessThan(client);
    expect(client).toBeLessThan(begin);
  });
});
