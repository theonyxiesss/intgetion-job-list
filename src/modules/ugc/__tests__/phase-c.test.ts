import { describe, expect, it, beforeEach } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import { ugcTools } from "../service/bot-tools";
import {
  acceptInvite,
  createCampaign,
  decideCampaign,
  decideSubmission,
  listOwedPayouts,
  markPayoutPaid,
  offerHire,
  readCampaign,
  saveCreatorProfile,
  submitVideo,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput, ProfileInput } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const ADMIN = "00000000-0000-4000-8000-000000000004";

const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];

function brief(over: Partial<BriefInput> = {}): BriefInput {
  return {
    companyId: COMPANY,
    productName: "North",
    productSummary: "A small app",
    goal: "awareness",
    niches,
    audience: "People who try new apps",
    country: null,
    languages: ["en"],
    mustSay: "Say the name",
    mustNot: "Do not promise income",
    platforms,
    videosWanted: 2,
    bountyMinor: BigInt(1500),
    deadline: "2026-10-20",
    rights: "ads",
    pitch: "We would like a short video",
    exampleUrls: [],
    ...over,
  };
}

function profile(over: Partial<ProfileInput> = {}): ProfileInput {
  return {
    displayName: "Ada",
    languages: ["en"],
    platforms,
    niches,
    country: null,
    exampleUrls: [],
    inviteOptIn: true,
    status: "active",
    ...over,
  };
}

describe("creative tests phase C", () => {
  let store: MemoryUgcStore;

  beforeEach(() => {
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
  });

  async function decided(
    to: "accepted" | "winner" | "rejected",
    rights: BriefInput["rights"] = "ads",
  ) {
    const created = await createCampaign(MEMBER, brief({ rights }));
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    await saveCreatorProfile(CREATOR, profile());
    const offer = await offerHire(MEMBER, created.id, CREATOR);
    await acceptInvite(CREATOR, offer.inviteId);
    await submitVideo(
      CREATOR,
      offer.inviteId,
      "https://www.tiktok.com/v/1",
      "",
    );
    const decision = await decideSubmission(MEMBER, offer.inviteId, to);
    return { campaignId: created.id, inviteId: offer.inviteId, decision };
  }

  it("records the snapshot when a video is accepted and sends nothing", async () => {
    const row = await decided("accepted");
    expect(row.decision).toEqual({ status: "accepted", charged: false });
    const view = await readCampaign(MEMBER, row.campaignId);
    if (view.role !== "company") throw new Error("role");
    expect(view.participants[0]?.payout).toEqual({
      amountMinor: "1500",
      status: "owed",
      charged: false,
      sent: false,
    });
    const creator = await readCampaign(CREATOR, row.campaignId);
    if (creator.role !== "creator") throw new Error("role");
    expect(creator.payout?.sent).toBe(false);
    expect(ugcTools.some((tool) => tool.name.includes("payout"))).toBe(false);
  });

  it("does not record a reward for a rejection or an admin brief rejection", async () => {
    const row = await decided("rejected");
    const view = await readCampaign(MEMBER, row.campaignId);
    if (view.role !== "company") throw new Error("role");
    expect(view.participants[0]?.payout).toBeNull();
    const created = await createCampaign(MEMBER, brief());
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: false,
      campaignId: created.id,
      to: "rejected",
    }).catch(() => undefined);
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "rejected",
    });
    expect(store.payouts.size).toBe(0);
  });

  it("lets only an admin mark the row, and the mark does not send money", async () => {
    await decided("winner");
    const owed = await listOwedPayouts(true);
    expect(owed).toHaveLength(1);
    expect(owed[0]?.sent).toBe(false);
    const payoutId = owed[0]?.id ?? "";
    await expect(listOwedPayouts(false)).rejects.toMatchObject({ status: 404 });
    await expect(
      markPayoutPaid({ adminId: null, isAdmin: true, payoutId }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      markPayoutPaid({ adminId: MEMBER, isAdmin: false, payoutId }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      markPayoutPaid({ adminId: CREATOR, isAdmin: false, payoutId }),
    ).rejects.toMatchObject({ status: 404 });
    const marked = await markPayoutPaid({
      adminId: ADMIN,
      isAdmin: true,
      payoutId,
    });
    expect(marked).toEqual({ status: "paid", charged: false, sent: false });
    expect(await listOwedPayouts(true)).toEqual([]);
    await expect(
      markPayoutPaid({ adminId: ADMIN, isAdmin: true, payoutId }),
    ).rejects.toMatchObject({ status: 409 });
    expect(store.audits.at(-1)).toMatchObject({
      action: "ugc.payout_paid",
      entityType: "ugc_payout",
    });
    expect(store.notices.some((notice) => notice.type.includes("pay"))).toBe(
      false,
    );
  });

  it("refuses a decision on a hire with no price and keeps it waiting", async () => {
    const created = await createCampaign(MEMBER, brief());
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    await saveCreatorProfile(CREATOR, profile());
    const offer = await offerHire(MEMBER, created.id, CREATOR);
    await acceptInvite(CREATOR, offer.inviteId);
    await submitVideo(
      CREATOR,
      offer.inviteId,
      "https://www.tiktok.com/v/3",
      "",
    );
    const invite = store.invites.get(offer.inviteId);
    if (!invite) throw new Error("invite");
    invite.bountyMinor = null;
    await expect(
      decideSubmission(MEMBER, offer.inviteId, "accepted"),
    ).rejects.toMatchObject({ status: 409 });
    const submission = [...store.submissions.values()].find(
      (row) => row.inviteId === offer.inviteId,
    );
    expect(submission?.status).toBe("submitted");
    expect(store.payouts.size).toBe(0);
  });

  it("records an accepted organic video and refuses an ad winner", async () => {
    const row = await decided("accepted", "organic");
    const view = await readCampaign(CREATOR, row.campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.payout?.amountMinor).toBe("1500");
    const created = await createCampaign(MEMBER, brief({ rights: "organic" }));
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    const offer = await offerHire(MEMBER, created.id, CREATOR);
    await acceptInvite(CREATOR, offer.inviteId);
    await submitVideo(
      CREATOR,
      offer.inviteId,
      "https://www.tiktok.com/v/2",
      "",
    );
    await expect(
      decideSubmission(MEMBER, offer.inviteId, "winner"),
    ).rejects.toMatchObject({ status: 409 });
    expect(store.payouts.size).toBe(1);
  });
});
