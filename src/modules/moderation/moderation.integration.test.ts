import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import type { CurrentUser } from "@/modules/auth/service";
import { decideQueueItem, listQueue, removeJob } from "./service";

const adminId = randomUUID();
const admin = { id: adminId } as CurrentUser;
const companyId = randomUUID();
const importedCompanyId = randomUUID();
const duplicateCompanyId = randomUUID();
const pendingJobId = randomUUID();
const importedJobId = randomUUID();
const liveJobId = randomUUID();
const queue: Record<string, string> = {
  pending: randomUUID(),
  pendingSibling: randomUUID(),
  imported: randomUUID(),
  company: randomUUID(),
  old: randomUUID(),
};
const token = adminId.slice(0, 8);
const description =
  "Moderation integration role description long enough for the schema constraints.";

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
  await db.execute(
    sql`insert into public.users(id,auth_uid,terms_accepted_at,terms_version) values (${adminId},${randomUUID()},now(),'10a-integration')`,
  );
  await db.execute(sql`insert into public.companies(id,name,slug,status,origin,created_by) values
    (${companyId},${`Moderation Co ${token}`},${`mod-${token}`},'unverified','internal',${adminId}),
    (${importedCompanyId},${`Imported Co ${token}`},${`mod-imp-${token}`},'unverified','imported',null),
    (${duplicateCompanyId},${`Duplicate Co ${token}`},${`mod-dup-${token}`},'unverified','internal',${adminId})`);
  await db.execute(sql`insert into public.jobs(id,company_id,title,description,category,work_format,employment_type,application_method,application_url,source,status,published_at,expires_at,risk_score,risk_flags,created_by) values
    (${pendingJobId},${companyId},${`Pending role ${token}`},${description},'engineering','remote','full_time','internal',null,'internal','pending_moderation',null,null,0,'[]',${adminId}),
    (${importedJobId},${importedCompanyId},${`Imported role ${token}`},${description},'support','remote','full_time','external_url','https://imported.invalid/apply','imported','removed',null,now()+interval '30 days',4,'["scam_pattern_rejected"]',null),
    (${liveJobId},${companyId},${`Live role ${token}`},${description},'engineering','remote','full_time','internal',null,'internal','published',now(),now()+interval '30 days',0,'[]',${adminId})`);
  await db.execute(
    sql`insert into public.company_members(company_id,user_id,role) values (${duplicateCompanyId},${adminId},'owner')`,
  );
  await db.execute(sql`insert into public.moderation_queue(id,entity_type,entity_id,reason,created_at) values
    (${queue.pending},'job',${pendingJobId},'job_publish_review',now()),
    (${queue.pendingSibling},'job',${pendingJobId},'unverified_company_job_edit',now()),
    (${queue.imported},'job',${importedJobId},'scam_pattern_rejected',now()),
    (${queue.company},'company',${duplicateCompanyId},'possible_duplicate',now()),
    (${queue.old},'job',${liveJobId},'job_publish_review',now() - interval '2 days')`);
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.moderation_queue where id in (${queue.pending},${queue.pendingSibling},${queue.imported},${queue.company},${queue.old})`,
  );
  await db.execute(
    sql`delete from public.companies where id in (${companyId},${importedCompanyId},${duplicateCompanyId})`,
  );
  await db.execute(
    sql`delete from public.audit_logs where actor_id = ${adminId}`,
  );
  await db.execute(sql`delete from public.users where id = ${adminId}`);
});

async function jobStatus(id: string) {
  const rows = await getDb().execute<{ status: string; risk_score: number }>(
    sql`select status, risk_score from public.jobs where id = ${id}`,
  );
  return rows[0];
}

async function notices(type: string) {
  const rows = await getDb().execute<{ payload: Record<string, unknown> }>(
    sql`select payload from public.notifications where user_id = ${adminId} and type = ${type}`,
  );
  return rows.map((row) => row.payload);
}

async function itemStatus(id: string) {
  const rows = await getDb().execute<{ status: string }>(
    sql`select status from public.moderation_queue where id = ${id}`,
  );
  return rows[0]?.status;
}

describe("moderation queue (10A)", () => {
  it("lists pending items oldest first and marks overdue ones", async () => {
    const { items } = await listQueue({ limit: 50 });
    const ours = items.filter((item) => Object.values(queue).includes(item.id));
    expect(ours[0]?.id).toBe(queue.old);
    expect(ours[0]?.overdue).toBe(true);
    expect(ours.find((item) => item.id === queue.pending)).toMatchObject({
      overdue: false,
      subject: { title: `Pending role ${token}`, status: "pending_moderation" },
    });
  });

  it("requires a note to reject and leaves the item pending", async () => {
    await expect(
      decideQueueItem(admin, queue.pending, { decision: "rejected" }, "ip"),
    ).rejects.toMatchObject({ status: 400 });
    expect(await itemStatus(queue.pending)).toBe("pending");
  });

  it("approves a pending job, closes its sibling items and refuses a second decision", async () => {
    await expect(
      decideQueueItem(admin, queue.pending, { decision: "approved" }, "ip"),
    ).resolves.toMatchObject({ effect: "approve_job" });
    expect((await jobStatus(pendingJobId))?.status).toBe("published");
    expect(await itemStatus(queue.pendingSibling)).toBe("approved");
    expect(await notices("job.moderation_decided")).toContainEqual({
      jobId: pendingJobId,
      jobTitle: `Pending role ${token}`,
      decision: "approved",
    });
    await expect(
      decideQueueItem(admin, queue.pending, { decision: "approved" }, "ip"),
    ).rejects.toMatchObject({ status: 409, code: "ALREADY_DECIDED" });
  });

  it("republishes an imported job rejected by mistake", async () => {
    await decideQueueItem(
      admin,
      queue.imported,
      { decision: "approved" },
      "ip",
    );
    expect(await jobStatus(importedJobId)).toEqual({
      status: "published",
      risk_score: 0,
    });
  });

  it("rejects a possible duplicate company with a reason", async () => {
    await decideQueueItem(
      admin,
      queue.company,
      { decision: "rejected", note: "Same company as an existing one" },
      "ip",
    );
    const rows = await getDb().execute<{ status: string }>(
      sql`select status from public.companies where id = ${duplicateCompanyId}`,
    );
    expect(rows[0]?.status).toBe("rejected");
    expect(await notices("company.verification_decided")).toContainEqual({
      companyId: duplicateCompanyId,
      companyName: `Duplicate Co ${token}`,
      decision: "rejected",
    });
  });

  it("removes a live job once and records it in the audit log", async () => {
    await removeJob(admin, liveJobId, "Spam reported by users", "ip");
    expect((await jobStatus(liveJobId))?.status).toBe("removed");
    await expect(
      removeJob(admin, liveJobId, "Spam reported by users", "ip"),
    ).rejects.toMatchObject({ status: 409 });
    const audit = await getDb().execute(
      sql`select 1 from public.audit_logs where actor_id = ${adminId} and action = 'admin.job_removed' and entity_id = ${liveJobId}`,
    );
    expect(audit).toHaveLength(1);
    const decisions = await getDb().execute(
      sql`select 1 from public.audit_logs where actor_id = ${adminId} and action = 'admin.queue_decided'`,
    );
    expect(decisions).toHaveLength(3);
  });
});
