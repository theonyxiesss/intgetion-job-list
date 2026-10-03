import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import type { CurrentUser } from "@/modules/auth/service";
import { decideQueueItem } from "@/modules/moderation/service";
import {
  confirmVerification,
  editCompany,
  getVerificationState,
  refreshTrustedFlags,
  requestVerification,
  type VerificationMailer,
} from "./service";

const ownerId = randomUUID();
const recruiterId = randomUUID();
const outsiderId = randomUUID();
const adminId = randomUUID();
const emailCompanyId = randomUUID();
const dnsCompanyId = randomUUID();
const token = ownerId.slice(0, 8);
const emailDomain = `mail-${token}.example`;
const dnsDomain = `dns-${token}.example`;
const user = (id: string) => ({ id, locale: "en" }) as CurrentUser;
const owner = user(ownerId);
const admin = user(adminId);
const description =
  "Verification integration role description long enough for the schema constraints.";

const sentLinks: string[] = [];
const mailer: VerificationMailer = async ({ link }) => {
  sentLinks.push(link);
  return true;
};

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("10B integration tests require a loopback database");
  }
  process.env.NEXT_PUBLIC_SITE_URL ??= "http://127.0.0.1:3000";
  const db = getDb();
  await db.execute(sql`
    insert into public.users (id, auth_uid, terms_accepted_at, terms_version)
    values (${ownerId}, ${randomUUID()}, now(), 'test'), (${recruiterId}, ${randomUUID()}, now(), 'test'),
           (${outsiderId}, ${randomUUID()}, now(), 'test'), (${adminId}, ${randomUUID()}, now(), 'test')
  `);
  await db.execute(sql`
    insert into public.companies (id, name, slug, domain, origin, status, created_by)
    values (${emailCompanyId}, ${`Mail Co ${token}`}, ${`mail-${token}`}, ${emailDomain}, 'internal', 'unverified', ${ownerId}),
           (${dnsCompanyId}, ${`Dns Co ${token}`}, ${`dns-${token}`}, ${dnsDomain}, 'internal', 'unverified', ${ownerId})
  `);
  await db.execute(sql`
    insert into public.company_members (company_id, user_id, role)
    values (${emailCompanyId}, ${ownerId}, 'owner'), (${emailCompanyId}, ${recruiterId}, 'recruiter'),
           (${dnsCompanyId}, ${ownerId}, 'owner')
  `);
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.moderation_queue where entity_id in (${emailCompanyId}, ${dnsCompanyId})`,
  );
  await db.execute(
    sql`delete from public.audit_logs where entity_id in (${emailCompanyId}, ${dnsCompanyId})`,
  );
  await db.execute(
    sql`delete from public.companies where id in (${emailCompanyId}, ${dnsCompanyId})`,
  );
  await db.execute(
    sql`delete from public.audit_logs where actor_id in (${ownerId}, ${adminId})`,
  );
  await db.execute(
    sql`delete from public.users where id in (${ownerId}, ${recruiterId}, ${outsiderId}, ${adminId})`,
  );
});

async function companyRow(id: string) {
  const rows = await getDb().execute<{ status: string; is_trusted: boolean }>(
    sql`select status, is_trusted from public.companies where id = ${id}`,
  );
  return rows[0];
}

async function pendingReviewItem(companyId: string) {
  const rows = await getDb().execute<{ id: string }>(sql`
    select id from public.moderation_queue
    where entity_id = ${companyId} and reason = 'verification_review' and status = 'pending'
  `);
  return rows[0]?.id;
}

describe("company verification (10B)", () => {
  it("only the owner may ask; others get 403 or 404", async () => {
    const input = {
      method: "corporate_email" as const,
      target: `hr@${emailDomain}`,
    };
    await expect(
      requestVerification(user(recruiterId), emailCompanyId, input, { mailer }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      requestVerification(user(outsiderId), emailCompanyId, input, { mailer }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      requestVerification(
        owner,
        emailCompanyId,
        { method: "corporate_email", target: "boss@gmail.com" },
        { mailer },
      ),
    ).rejects.toMatchObject({ code: "FREE_EMAIL_DOMAIN" });
  });

  it("confirms the domain by the emailed link and stores only a hash", async () => {
    const result = await requestVerification(
      owner,
      emailCompanyId,
      { method: "corporate_email", target: `HR@${emailDomain}` },
      { mailer },
    );
    expect(result).toMatchObject({ emailSent: true });
    const link = new URL(sentLinks.at(-1)!);
    const emailed = link.searchParams.get("token")!;
    expect(link.pathname).toBe("/en/employer/company/verify");
    const stored = await getDb().execute<{ token_hash: string }>(
      sql`select token_hash from public.company_verifications where company_id = ${emailCompanyId}`,
    );
    expect(stored.map((row) => row.token_hash)).not.toContain(emailed);

    await expect(
      confirmVerification(owner, emailCompanyId, "x".repeat(43)),
    ).rejects.toMatchObject({ status: 404 });
    const state = await confirmVerification(owner, emailCompanyId, emailed);
    expect(state.steps).toMatchObject({
      domainConfirmed: true,
      requisitesComplete: false,
    });
    expect(state.companyStatus).toBe("unverified");
  });

  it("goes to the queue once requisites are complete", async () => {
    await editCompany(emailCompanyId, owner, {
      legalName: `Mail Co ${token} Ltd`,
      country: "de",
      websiteUrl: `https://www.${emailDomain}/`,
    });
    expect((await companyRow(emailCompanyId))?.status).toBe(
      "pending_verification",
    );
    expect(await pendingReviewItem(emailCompanyId)).toBeTruthy();
  });

  it("is verified by the admin only after the first job passed moderation", async () => {
    const itemId = (await pendingReviewItem(emailCompanyId))!;
    await expect(
      decideQueueItem(admin, itemId, { decision: "approved" }, "ip"),
    ).rejects.toMatchObject({ status: 409, code: "VERIFICATION_INCOMPLETE" });
    expect(await pendingReviewItem(emailCompanyId)).toBe(itemId);

    const jobId = randomUUID();
    await getDb().execute(sql`
      insert into public.jobs (id, company_id, title, description, category, work_format, employment_type, application_method, status, published_at, expires_at)
      values (${jobId}, ${emailCompanyId}, ${`First role ${token}`}, ${description}, 'engineering', 'remote', 'full_time', 'internal', 'published', now(), now() + interval '30 days')
    `);
    await getDb().execute(sql`
      insert into public.job_status_history (job_id, from_status, to_status, actor_id, reason)
      values (${jobId}, 'pending_moderation', 'published', ${adminId}, 'approve')
    `);
    await decideQueueItem(admin, itemId, { decision: "approved" }, "ip");
    expect((await companyRow(emailCompanyId))?.status).toBe("verified");
  });

  it("confirms by DNS only when the TXT record is live", async () => {
    const { dnsRecord } = (await requestVerification(owner, dnsCompanyId, {
      method: "dns_txt",
    })) as { dnsRecord: string };
    expect(dnsRecord).toMatch(/^intgetion-verify=[\w-]{43}$/);
    const code = dnsRecord.slice("intgetion-verify=".length);
    await expect(
      confirmVerification(owner, dnsCompanyId, code, {
        resolveTxt: async () => [["v=spf1 -all"]],
      }),
    ).rejects.toMatchObject({ code: "DNS_RECORD_NOT_FOUND" });
    const queried: string[] = [];
    const state = await confirmVerification(owner, dnsCompanyId, code, {
      resolveTxt: async (domain) => {
        queried.push(domain);
        return [[dnsRecord]];
      },
    });
    expect(queried).toEqual([dnsDomain]);
    expect(state.steps.domainConfirmed).toBe(true);
  });

  it("expires a token after 72 hours", async () => {
    const { dnsRecord } = (await requestVerification(owner, dnsCompanyId, {
      method: "dns_txt",
    })) as { dnsRecord: string };
    const later = new Date(Date.now() + 73 * 60 * 60 * 1000);
    await expect(
      confirmVerification(
        owner,
        dnsCompanyId,
        dnsRecord.slice("intgetion-verify=".length),
        { now: () => later, resolveTxt: async () => [[dnsRecord]] },
      ),
    ).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
    const state = await getVerificationState(owner, dnsCompanyId);
    expect(state.latest?.status).toBe("expired");
  });

  it("grants Trusted by 14.2 and drops it when a condition fails", async () => {
    const db = getDb();
    await db.execute(sql`
      insert into public.jobs (id, company_id, title, description, category, work_format, employment_type, application_method, status, published_at, expires_at)
      select gen_random_uuid(), ${emailCompanyId}, 'Trusted role ' || n, ${description}, 'engineering', 'remote', 'full_time', 'internal', 'published', now(), now() + interval '30 days'
      from generate_series(1, 4) n
    `);
    await refreshTrustedFlags(new Date(), async () => 0);
    expect((await companyRow(emailCompanyId))?.is_trusted).toBe(true);
    // No confirmed reports in the database: the flag stays (D84).
    await refreshTrustedFlags(new Date());
    expect((await companyRow(emailCompanyId))?.is_trusted).toBe(true);
    // One confirmed report in 90 days drops it.
    await refreshTrustedFlags(new Date(), async (id) =>
      id === emailCompanyId ? 1 : 0,
    );
    expect((await companyRow(emailCompanyId))?.is_trusted).toBe(false);
  });
});
