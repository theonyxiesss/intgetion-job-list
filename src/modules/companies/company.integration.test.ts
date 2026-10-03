import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  addCompanyMember,
  changeCompanyStatus,
  createCompany,
  findMemberRole,
  removeCompanyMember,
} from "./service";

const ownerId = randomUUID();
const memberId = randomUUID();
const outsiderId = randomUUID();
const internalCompanyId = randomUUID();
const importedCompanyId = randomUUID();
const duplicateIds: string[] = [];

async function seed() {
  const db = getDb();
  await db.execute(sql`
    insert into public.users (id, auth_uid, terms_accepted_at, terms_version)
    values (${ownerId}, ${randomUUID()}, now(), 'test'), (${memberId}, ${randomUUID()}, now(), 'test'), (${outsiderId}, ${randomUUID()}, now(), 'test')
  `);
  await db.execute(sql`
    insert into public.companies (id, name, slug, origin, created_by)
    values (${internalCompanyId}, 'Integration Company', ${`it-${internalCompanyId}`}, 'internal', ${ownerId}),
           (${importedCompanyId}, 'Imported Company', ${`it-${importedCompanyId}`}, 'imported', null)
  `);
  await db.execute(
    sql`insert into public.company_members (company_id, user_id, role) values (${internalCompanyId}, ${ownerId}, 'owner')`,
  );
}

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.audit_logs where actor_id = ${ownerId}`,
  );
  if (duplicateIds.length) {
    const ids = sql.join(
      duplicateIds.map((id) => sql`${id}`),
      sql`, `,
    );
    await db.execute(
      sql`delete from public.moderation_queue where entity_id in (${ids})`,
    );
    await db.execute(sql`delete from public.companies where id in (${ids})`);
  }
  await db.execute(
    sql`delete from public.companies where id in (${internalCompanyId}, ${importedCompanyId})`,
  );
  await db.execute(
    sql`delete from public.users where id in (${ownerId}, ${memberId}, ${outsiderId})`,
  );
});

beforeAll(seed);

describe("company membership in Postgres", () => {
  it("looks up membership and hides non-members", async () => {
    expect(await findMemberRole(internalCompanyId, ownerId)).toBe("owner");
    expect(await findMemberRole(internalCompanyId, outsiderId)).toBeNull();
  });

  it("rejects joining imported companies and keeps the last owner", async () => {
    await addCompanyMember(internalCompanyId, memberId);
    expect(await findMemberRole(internalCompanyId, memberId)).toBe("member");
    await expect(
      addCompanyMember(importedCompanyId, outsiderId),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      removeCompanyMember(internalCompanyId, ownerId),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("records company status changes in audit_logs", async () => {
    await changeCompanyStatus(
      internalCompanyId,
      ownerId,
      "pending_verification",
    );
    const rows = await getDb().execute<{
      action: string;
      diff: { from: string; to: string };
    }>(sql`
      select action, diff from public.audit_logs where actor_id = ${ownerId} and entity_id = ${internalCompanyId}
    `);
    expect(rows).toContainEqual(
      expect.objectContaining({
        action: "company.status_changed",
        diff: { from: "unverified", to: "pending_verification" },
      }),
    );
  });

  it("creates a same-domain company and queues possible_duplicate", async () => {
    const now = new Date();
    const user = {
      id: ownerId,
      authUid: randomUUID(),
      platformRole: "user" as const,
      status: "active" as const,
      locale: "en",
      termsAcceptedAt: now,
      termsVersion: "test",
      marketingOptIn: false,
      lastActiveAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const domain = `duplicate-${randomUUID()}.example.com`;
    const first = await createCompany(user, {
      name: "Duplicate Detection Company",
      domain,
    });
    duplicateIds.push(first.id);
    const second = await createCompany(user, {
      name: "Duplicate Detection Company",
      domain,
    });
    duplicateIds.push(second.id);
    expect(second.id).not.toBe(first.id);
    const rows = await getDb().execute<{
      reason: string;
      risk_flags: string[];
    }>(sql`
      select reason, risk_flags from public.moderation_queue where entity_id = ${second.id}
    `);
    expect(rows).toContainEqual(
      expect.objectContaining({
        reason: "possible_duplicate",
        risk_flags: ["possible_duplicate"],
      }),
    );
  });
});
