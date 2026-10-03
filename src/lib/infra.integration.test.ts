import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { HttpError } from "@/lib/http";
import { recordAudit } from "./audit";
import { privacyHash } from "./privacy-hash";
import {
  deleteExpiredCounters,
  enforceRateLimit,
  hit,
  rateKey,
  rateRules,
} from "./rate-limit";

const subject = `it-${randomUUID()}@example.com`;
const actorId = randomUUID();

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from rate_limit_counters where key like ${"%" + privacyHash(subject)}`,
  );
  await db.execute(
    sql`delete from rate_limit_counters where key like 'it-old:%'`,
  );
  await db.execute(sql`delete from audit_logs where actor_id = ${actorId}`);
});

describe("rate limits in Postgres (D26, P15)", () => {
  it("allows the limit and refuses the next hit with Retry-After", async () => {
    const now = new Date();
    for (let i = 0; i < rateRules.login.limit; i += 1) {
      await enforceRateLimit("login", subject, now);
    }
    const error = await enforceRateLimit("login", subject, now).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 429, code: "RATE_LIMITED" });
    const retryAfter = Number((error as HttpError).headers?.["Retry-After"]);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(rateRules.login.windowSeconds);
  });

  it("keeps buckets apart and never stores the raw subject", async () => {
    await enforceRateLimit("emailLink", subject);
    const rows = await getDb().execute<{ key: string }>(
      sql`select key from rate_limit_counters where key like ${"%" + privacyHash(subject)}`,
    );
    const keys = rows.map((row) => row.key).sort();
    expect(keys).toEqual([
      rateKey("emailLink", subject),
      rateKey("login", subject),
    ]);
    expect(keys.join()).not.toContain("example.com");
  });

  it("counts concurrent hits without losing any", async () => {
    const key = `it-race:${randomUUID()}`;
    const rule = { limit: 100, windowSeconds: 60 };
    const now = new Date();
    await Promise.all(Array.from({ length: 10 }, () => hit(key, rule, now)));
    const rows = await getDb().execute<{ count: number }>(
      sql`select count from rate_limit_counters where key = ${key}`,
    );
    expect(Number(rows[0]?.count)).toBe(10);
    await getDb().execute(
      sql`delete from rate_limit_counters where key = ${key}`,
    );
  });

  it("drops windows older than 48 hours", async () => {
    const key = `it-old:${randomUUID()}`;
    const old = new Date(Date.now() - 49 * 60 * 60 * 1000);
    await hit(key, { limit: 1, windowSeconds: 60 }, old);
    expect(await deleteExpiredCounters()).toBeGreaterThanOrEqual(1);
    const rows = await getDb().execute(
      sql`select 1 from rate_limit_counters where key = ${key}`,
    );
    expect(rows.length).toBe(0);
  });
});

describe("audit_logs", () => {
  it("stores an IP hash, not the IP, and is append-only for app_rw", async () => {
    await recordAudit({
      actorId,
      action: "auth.admin_sign_in",
      entityType: "user",
      entityId: actorId,
      diff: { method: "password" },
      ip: "203.0.113.7",
    });
    const rows = await getDb().execute<{ ip_hash: string; action: string }>(
      sql`select ip_hash, action from audit_logs where actor_id = ${actorId}`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe("auth.admin_sign_in");
    expect(rows[0]?.ip_hash).toBe(privacyHash("203.0.113.7"));
    expect(rows[0]?.ip_hash).not.toContain("203.0.113");

    // Drizzle wraps the driver error; the Postgres error is the cause.
    const error = await getDb()
      .execute(
        sql`update audit_logs set action = 'tampered' where actor_id = ${actorId}`,
      )
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );
    expect(error).toBeInstanceOf(Error);
    const cause = (error as Error).cause as { code?: string } | undefined;
    expect(cause?.code).toBe("42501"); // insufficient_privilege
  });
});
