import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import type { CurrentUser } from "@/modules/auth/service";
import { decideReport, listReports } from "./service";

const adminId = randomUUID();
const admin = { id: adminId } as CurrentUser;
const reporters = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const companyId = randomUUID();
const jobIds = [randomUUID(), randomUUID(), randomUUID()];
const draftJobId = randomUUID();
const reportIds = reporters.map(() => randomUUID());
const token = adminId.slice(0, 8);
const description =
  "Reports integration role description long enough for the schema constraints.";

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("10A integration tests require a loopback database");
  }
  const db = getDb();
  for (const id of [adminId, ...reporters]) {
    await db.execute(
      sql`insert into public.users (id, auth_uid, terms_accepted_at, terms_version) values (${id}, ${randomUUID()}, now(), 'test')`,
    );
  }
  await db.execute(
    sql`insert into public.companies (id, name, slug, status) values (${companyId}, ${`Reported Co ${token}`}, ${`reported-${token}`}, 'verified')`,
  );
  for (const id of jobIds) {
    await db.execute(sql`
      insert into public.jobs (id, company_id, title, description, category, work_format, employment_type, application_method, status, published_at, expires_at)
      values (${id}, ${companyId}, ${`Reported role ${id.slice(0, 6)}`}, ${description}, 'engineering', 'remote', 'full_time', 'internal', 'published', now(), now() + interval '30 days')
    `);
  }
  await db.execute(sql`
    insert into public.jobs (id, company_id, title, description, category, work_format, employment_type, application_method, status)
    values (${draftJobId}, ${companyId}, 'Draft role', ${description}, 'engineering', 'remote', 'full_time', 'internal', 'draft')
  `);
  // Three reporters on different jobs of the company, one on the company.
  const targets: [string, string][] = [
    ["job", jobIds[0]!],
    ["job", jobIds[1]!],
    ["company", companyId],
    ["job", jobIds[2]!],
  ];
  for (const [i, [type, id]] of targets.entries()) {
    await db.execute(sql`
      insert into public.reports (id, reporter_id, entity_type, entity_id, reason)
      values (${reportIds[i]!}, ${reporters[i]!}, ${type}, ${id}, 'scam')
    `);
  }
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.moderation_queue where entity_id = ${companyId}`,
  );
  await db.execute(
    sql`delete from public.audit_logs where actor_id = ${adminId}`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  for (const id of [adminId, ...reporters]) {
    await db.execute(sql`delete from public.users where id = ${id}`);
  }
});

async function statuses() {
  const rows = await getDb().execute<{ id: string; status: string }>(
    sql`select id, status from public.jobs where company_id = ${companyId}`,
  );
  return Object.fromEntries(rows.map((row) => [row.id, row.status]));
}

describe("reports and auto-pause (10A, 14.5)", () => {
  it("lists open reports with the job and company", async () => {
    const { items } = await listReports({ limit: 50, status: "open" });
    const ours = items.find((item) => item.id === reportIds[0]);
    expect(ours).toMatchObject({
      entityType: "job",
      companyId,
      companyName: `Reported Co ${token}`,
    });
    expect(ours).not.toHaveProperty("reporterId");
  });

  it("does not pause below three confirmed reports; dismissed ones do not count", async () => {
    await decideReport(admin, reportIds[0]!, { decision: "confirmed" }, "ip");
    await decideReport(admin, reportIds[1]!, { decision: "dismissed" }, "ip");
    await decideReport(admin, reportIds[2]!, { decision: "confirmed" }, "ip");
    expect(Object.values(await statuses())).not.toContain("paused");
    await expect(
      decideReport(admin, reportIds[0]!, { decision: "dismissed" }, "ip"),
    ).rejects.toMatchObject({ status: 409, code: "ALREADY_DECIDED" });
  });

  it("pauses every published job and queues the company at the third", async () => {
    const result = await decideReport(
      admin,
      reportIds[3]!,
      { decision: "confirmed" },
      "ip",
    );
    expect(result.pausedJobs).toBe(3);
    const after = await statuses();
    for (const id of jobIds) expect(after[id]).toBe("paused");
    expect(after[draftJobId]).toBe("draft");
    const queued = await getDb().execute(sql`
      select 1 from public.moderation_queue
      where entity_id = ${companyId} and reason = 'reports_threshold' and status = 'pending'
    `);
    expect(queued).toHaveLength(1);
    const audit = await getDb().execute(sql`
      select 1 from public.audit_logs where action = 'company.auto_paused' and entity_id = ${companyId}
    `);
    expect(audit).toHaveLength(1);
  });
});
