import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import {
  applyToCampaign,
  createCampaign,
  decideCampaign,
  offerHire,
  saveCreatorProfile,
  ugcNextStep,
} from "@/modules/ugc/service";
import {
  confirmAction,
  conversationHistory,
  offerUgcNextStep,
  pendingConfirmations,
  resumeConversation,
} from "./service";

/**
 * Spoki offers the next UGC step when a brief thread opens (D467): one line
 * per step, one card for a write, an answered card is not pushed again.
 * The campaign wallet is off here (no checkout env), so no budget step.
 */

const memberId = randomUUID();
const creatorId = randomUUID();
const strangerId = randomUUID();
const adminId = randomUUID();
const userIds = [memberId, creatorId, strangerId, adminId];
const companyId = randomUUID();
const token = memberId.slice(0, 8);
const saved = process.env.BILLING_ENABLED;

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

beforeAll(async () => {
  delete process.env.BILLING_ENABLED;
  const db = getDb();
  for (const id of userIds) {
    await db.insert(users).values({
      id,
      authUid: randomUUID(),
      termsAcceptedAt: new Date(),
      termsVersion: "2026-10-03",
      locale: "en",
      platformRole: id === adminId ? "admin" : "user",
    });
  }
  await db.execute(sql`
    insert into public.companies (id, name, slug, status)
    values (${companyId}, ${`Next ${token}`}, ${`ugc-next-${token}`}, 'verified')
  `);
  await db.execute(sql`
    insert into public.company_members (company_id, user_id, role)
    values (${companyId}, ${memberId}, 'owner')
  `);
});

afterAll(async () => {
  if (saved === undefined) delete process.env.BILLING_ENABLED;
  else process.env.BILLING_ENABLED = saved;
  const db = getDb();
  await db.execute(
    sql`delete from public.ugc_campaigns where company_id = ${companyId}`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  await db.delete(users).where(inArray(users.id, userIds));
});

const nextLines = async (conversationId: string) =>
  (await conversationHistory(conversationId)).filter(
    (row) => row.role === "assistant" && row.content.startsWith("Next step"),
  );

describe("Spoki next UGC step (D467)", () => {
  it("offers the hire once, then the reminder, and never repeats a line", async () => {
    const productName = `Next test ${token}`;
    const created = await createCampaign(memberId, {
      companyId,
      productName,
      productSummary: "A small app for trying the next step",
      goal: "awareness",
      niches: ["app"],
      audience: "People who try new apps",
      country: null,
      languages: ["en"],
      mustSay: "Say the name",
      mustNot: "Do not promise income",
      platforms: ["tiktok"],
      videosWanted: 2,
      bountyMinor: BigInt(1500),
      deadline: inDays(30),
      rights: "organic",
      pitch: "We would like a short video",
      exampleUrls: [],
    });
    await decideCampaign({
      adminId,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    await saveCreatorProfile(creatorId, {
      displayName: "Ada",
      languages: ["en"],
      platforms: ["tiktok"],
      niches: ["app"],
      country: null,
      exampleUrls: [],
      inviteOptIn: true,
      status: "active",
    });
    await applyToCampaign(creatorId, created.id);

    // A stranger and a missing brief get no step.
    expect(
      await ugcNextStep(strangerId, { campaignId: created.id }),
    ).toBeNull();
    expect(
      await ugcNextStep(memberId, { campaignId: randomUUID() }),
    ).toBeNull();

    const open = async () => {
      const { conversation } = await resumeConversation({
        userId: memberId,
        token: undefined,
        locale: "en",
        campaignId: created.id,
        productName,
      });
      return offerUgcNextStep({
        conversation: conversation!,
        userId: memberId,
        locale: "en",
        step: await ugcNextStep(memberId, { campaignId: created.id }),
      }).then(async (link) => ({ conversation: conversation!, link }));
    };

    const first = await open();
    expect(first.link).toBeNull();
    const cards = await pendingConfirmations(first.conversation.id, memberId);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      tool: "offer_ugc_hire",
      args: { campaignId: created.id, creatorId },
    });
    expect(await nextLines(first.conversation.id)).toHaveLength(1);

    // Opening again writes nothing new.
    const again = await open();
    expect(again.conversation.id).toBe(first.conversation.id);
    expect(await nextLines(first.conversation.id)).toHaveLength(1);
    expect(
      await pendingConfirmations(first.conversation.id, memberId),
    ).toHaveLength(1);

    // "Not now" on the card: it is not pushed again on the next open.
    await confirmAction({
      userId: memberId,
      conversation: again.conversation,
      confirmationId: cards[0]!.confirmationId,
      accept: false,
    });
    await open();
    expect(
      await pendingConfirmations(first.conversation.id, memberId),
    ).toHaveLength(0);

    // The company offers on the page; the next step is now one reminder.
    await offerHire(memberId, created.id, creatorId);
    const later = await open();
    expect(later.link).toBeNull();
    expect(await nextLines(first.conversation.id)).toHaveLength(2);
    const [remind] = await pendingConfirmations(
      first.conversation.id,
      memberId,
    );
    expect(remind).toMatchObject({ tool: "remind_ugc_invites" });
    // Confirming the card runs the real tool in this brief thread.
    const done = await confirmAction({
      userId: memberId,
      conversation: later.conversation,
      confirmationId: remind!.confirmationId,
      accept: true,
    });
    expect(done).toMatchObject({ accepted: true });
    expect(
      (await conversationHistory(first.conversation.id)).some((row) =>
        row.content.startsWith("The user confirmed remind_ugc_invites."),
      ),
    ).toBe(true);
    expect(await ugcNextStep(memberId, { campaignId: created.id })).toBeNull();
    await open();
    expect(await nextLines(first.conversation.id)).toHaveLength(2);
    expect(
      await pendingConfirmations(first.conversation.id, memberId),
    ).toHaveLength(0);
  });
});
