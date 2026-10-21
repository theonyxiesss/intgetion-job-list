import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { confirmBriefDraft } from "./service";

/**
 * Sending a brief draft is one-shot on the server (D520): two calls at
 * once create one campaign, and a failed create puts the draft back.
 */

const memberId = randomUUID();
const companyId = randomUUID();
const token = memberId.slice(0, 8);

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function completeDraft(deadline: string) {
  return {
    productName: `Claim test ${token}`,
    description: "A small app for trying the one-shot brief send",
    goal: "awareness",
    niche: "app",
    audience: "People who try new apps",
    languages: ["en"],
    platform: "tiktok",
    videoCount: 2,
    rewardCents: 1500,
    deadline,
    rights: "organic",
  };
}

async function putDraft(draft: Record<string, unknown>) {
  await getDb().execute(sql`
    insert into public.ugc_brief_drafts (user_id, company_id, draft)
    values (${memberId}, ${companyId}, ${JSON.stringify(draft)}::jsonb)
    on conflict (user_id) do update set draft = excluded.draft,
      company_id = excluded.company_id
  `);
}

async function campaigns(): Promise<number> {
  const rows = await getDb().execute<{ n: number }>(sql`
    select count(*)::int as n from public.ugc_campaigns
    where company_id = ${companyId}
  `);
  return rows[0]?.n ?? 0;
}

async function drafts(): Promise<number> {
  const rows = await getDb().execute<{ n: number }>(sql`
    select count(*)::int as n from public.ugc_brief_drafts
    where user_id = ${memberId}
  `);
  return rows[0]?.n ?? 0;
}

beforeAll(async () => {
  const db = getDb();
  await db.insert(users).values({
    id: memberId,
    authUid: randomUUID(),
    termsAcceptedAt: new Date(),
    termsVersion: "2026-10-03",
    locale: "en",
  });
  await db.execute(sql`
    insert into public.companies (id, name, slug, status)
    values (${companyId}, ${`Claim ${token}`}, ${`ugc-claim-${token}`}, 'verified')
  `);
  await db.execute(sql`
    insert into public.company_members (company_id, user_id, role)
    values (${companyId}, ${memberId}, 'owner')
  `);
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.ugc_campaigns where company_id = ${companyId}`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  await db.delete(users).where(inArray(users.id, [memberId]));
});

describe("one-shot brief send (D520)", () => {
  it("creates one campaign when two sends race", async () => {
    await putDraft(completeDraft(inDays(30)));
    const results = await Promise.allSettled([
      confirmBriefDraft(memberId),
      confirmBriefDraft(memberId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await campaigns()).toBe(1);
    expect(await drafts()).toBe(0);
  });

  it("puts the draft back when the campaign cannot be created", async () => {
    // Complete for the draft check, refused by the campaign rules: a reward
    // above the limit the campaign itself accepts would be the same; here
    // the company is not the person's, so createCampaign refuses.
    await getDb().execute(
      sql`delete from public.company_members where user_id = ${memberId}`,
    );
    await putDraft(completeDraft(inDays(30)));
    await expect(confirmBriefDraft(memberId)).rejects.toBeTruthy();
    expect(await drafts()).toBe(1);
    await getDb().execute(sql`
      insert into public.company_members (company_id, user_id, role)
      values (${companyId}, ${memberId}, 'owner')
    `);
  });
});
