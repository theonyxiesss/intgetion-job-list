import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import type { LiveSource } from "./adapters/live";
import type { RawImportedJob } from "./adapters/types";
import { runLiveImports, setImportSourceEnabled } from "./service";

const token = randomUUID().slice(0, 8);
const domain = `live-${token}.invalid`;
const description =
  "Build synthetic account services and maintain fictional sample APIs with a small remote team.";

const feed: RawImportedJob[] = ["a", "b", "c", "d"].map((key) => ({
  externalId: `live-${key}`,
  companyName: `Live Widgets ${token}`,
  companyDomain: domain,
  title: `Role ${key.toUpperCase()} ${token}`,
  description: `${description} Team ${key}.`,
  category: "",
  employmentType: null,
  timeZone: null,
  skills: [],
  applyUrl: `https://${domain}/jobs/${key}`,
  expiresAt: null,
}));

const source: LiveSource = {
  sourceName: `Live API ${token}`,
  kind: "api",
  url: `https://${domain}/api`,
  minIntervalMs: 6 * 60 * 60 * 1000,
  newPerRun: 2,
  fetch: async () => feed,
};

const start = new Date();
const later = (h: number) => new Date(start.getTime() + h * 60 * 60 * 1000);
const run = (at: Date) =>
  runLiveImports({
    sources: [source],
    resolveSkill: async () => null,
    isScam: () => false,
    now: () => at,
  });

async function storedCount(): Promise<number> {
  const [row] = await getDb().execute<{ count: number }>(sql`
    select count(*)::int as count from public.job_sources s
    join public.import_sources i on i.id = s.import_source_id
    where i.name = ${source.sourceName}
  `);
  return row?.count ?? 0;
}

beforeAll(() => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("8B integration tests require a loopback database");
  }
});

afterAll(async () => {
  const db = getDb();
  await db.execute(sql`delete from public.companies where name = ${`Live Widgets ${token}`}`);
  await db.execute(sql`delete from public.import_sources where name = ${source.sourceName}`);
});

describe("live import (8B, D342)", () => {
  it("registers a new source switched off and fetches nothing", async () => {
    const [report] = await run(start);
    expect(report?.skipped).toBe(true);
    expect(await storedCount()).toBe(0);
  });

  it("writes only the per-run budget of new jobs once it is on", async () => {
    const [row] = await getDb().execute<{ id: string }>(sql`
      update public.import_sources set republish_allowed = true
      where name = ${source.sourceName} returning id
    `);
    await setImportSourceEnabled(row!.id, true);
    const [report] = await run(start);
    expect(report).toMatchObject({ skipped: false, created: 2, error: null });
    expect(await storedCount()).toBe(2);
  });

  it("waits for the source's own interval", async () => {
    const [report] = await run(later(5));
    expect(report?.skipped).toBe(true);
  });

  it("refreshes the stored jobs and adds the next budget", async () => {
    const [report] = await run(later(7));
    expect(report).toMatchObject({ skipped: false, created: 2, updated: 2 });
    expect(await storedCount()).toBe(4);
  });

  it("stops when the admin turns the source off", async () => {
    const [row] = await getDb().execute<{ id: string }>(sql`
      select id from public.import_sources where name = ${source.sourceName}
    `);
    await setImportSourceEnabled(row!.id, false);
    const [report] = await run(later(20));
    expect(report?.skipped).toBe(true);
  });
});
