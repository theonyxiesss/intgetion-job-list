import { describe, expect, it, beforeEach } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import {
  acceptInvite,
  applyToCampaign,
  campaignWriteAllowed,
  closeCampaign,
  createCampaign,
  decideCampaign,
  decideSubmission,
  decisionFromUtterance,
  declineInvite,
  issueJoinLink,
  listOpenCampaigns,
  offerHire,
  previewMatches,
  readCampaign,
  redeemJoinToken,
  requestChanges,
  saveCreatorProfile,
  submitVideo,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput, ProfileInput } from "../service/records";
import { startPayloadRoute, ugcTokenFromStart } from "../service/start-payload";
import { hashJoinToken } from "../service/rules";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const OUTSIDER = "00000000-0000-4000-8000-000000000002";
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

describe("creative tests phase A", () => {
  let store: MemoryUgcStore;

  beforeEach(() => {
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
  });

  it("refuses a guest and a non-member", async () => {
    await expect(createCampaign(null, brief())).rejects.toMatchObject({
      status: 401,
    });
    await expect(acceptInvite(null, "x")).rejects.toMatchObject({ status: 401 });
    await expect(createCampaign(OUTSIDER, brief())).rejects.toMatchObject({
      status: 404,
    });
    const created = await createCampaign(MEMBER, brief());
    await expect(readCampaign(OUTSIDER, created.id)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("does not hire on apply, and does not take a video before hire", async () => {
    const created = await createCampaign(MEMBER, brief());
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    await saveCreatorProfile(CREATOR, profile());
    const applied = await applyToCampaign(CREATOR, created.id);
    expect(applied.status).toBe("applied");
    await expect(
      submitVideo(CREATOR, applied.inviteId, "https://www.tiktok.com/v/1", ""),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a fourth offer to the same creator in one day", async () => {
    await saveCreatorProfile(CREATOR, profile());
    for (let index = 0; index < 3; index += 1) {
      const created = await createCampaign(MEMBER, brief());
      await decideCampaign({
        adminId: ADMIN,
        isAdmin: true,
        campaignId: created.id,
        to: "open",
      });
      await offerHire(MEMBER, created.id, CREATOR);
    }
    const fourth = await createCampaign(MEMBER, brief());
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: fourth.id,
      to: "open",
    });
    await expect(offerHire(MEMBER, fourth.id, CREATOR)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("allows one revision and refuses the second", async () => {
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
      "https://www.tiktok.com/v/1",
      "",
    );
    await requestChanges(MEMBER, offer.inviteId, "Cut the first second");
    await submitVideo(
      CREATOR,
      offer.inviteId,
      "https://www.tiktok.com/v/2",
      "",
    );
    await expect(
      requestChanges(MEMBER, offer.inviteId, "Once more"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects a host outside the list and does not fetch the url", async () => {
    const created = await openBrief();
    await saveCreatorProfile(CREATOR, profile());
    const offer = await offerHire(MEMBER, created, CREATOR);
    await acceptInvite(CREATOR, offer.inviteId);
    let fetched = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (() => {
      fetched += 1;
      throw new Error("fetch");
    }) as typeof fetch;
    try {
      await expect(
        submitVideo(CREATOR, offer.inviteId, "https://example.com/v", ""),
      ).rejects.toMatchObject({ status: 422 });
      expect(fetched).toBe(0);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("matches only when platform, language and niche overlap", async () => {
    const created = await openBrief();
    await saveCreatorProfile(CREATOR, profile({ niches: ["finance"] }));
    expect(await previewMatches(MEMBER, created)).toEqual([]);
    await saveCreatorProfile(CREATOR, profile());
    expect(await previewMatches(MEMBER, created)).toHaveLength(1);
  });

  it("keeps a rejected brief closed and does not charge", async () => {
    const created = await createCampaign(MEMBER, brief());
    const decided = await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "rejected",
    });
    expect(decided.status).toBe("rejected");
    await saveCreatorProfile(CREATOR, profile());
    expect(await listOpenCampaigns(CREATOR)).toEqual([]);
    expect(store.notices.some((notice) => notice.type.includes("pay"))).toBe(
      false,
    );
    expect(store.audits[0]?.action).toBe("ugc.campaign_reject");
  });

  it("stops a new video after the deadline and still accepts the old one", async () => {
    const created = await openBrief();
    await saveCreatorProfile(CREATOR, profile());
    const offer = await offerHire(MEMBER, created, CREATOR);
    await acceptInvite(CREATOR, offer.inviteId);
    await submitVideo(
      CREATOR,
      offer.inviteId,
      "https://youtu.be/abcdefghijk",
      "",
    );
    store.clock = new Date("2026-10-21T00:00:00.000Z");
    await expect(
      submitVideo(CREATOR, offer.inviteId, "https://youtu.be/zzzzzzzzzzz", ""),
    ).rejects.toMatchObject({ status: 409 });
    const decided = await decideSubmission(MEMBER, offer.inviteId, "accepted");
    expect(decided).toEqual({ status: "accepted", charged: false });
  });

  it("does not treat a bare yes as a hire or a winner", () => {
    expect(decisionFromUtterance("да")).toBeNull();
    expect(decisionFromUtterance("yes")).toBeNull();
  });

  it("does not write a campaign from the services topic", () => {
    expect(campaignWriteAllowed("services")).toBe(false);
    expect(campaignWriteAllowed(undefined)).toBe(false);
    expect(campaignWriteAllowed("ugc")).toBe(true);
  });

  it("keeps contacts and the raw token out of the model text", async () => {
    const created = await openBrief();
    await saveCreatorProfile(CREATOR, profile());
    const cards = await previewMatches(MEMBER, created);
    expect(JSON.stringify(cards)).not.toMatch(/email|telegram|wallet|phone/i);
    const link = await issueJoinLink(MEMBER, created);
    expect(link.forModel).not.toContain(link.payload);
    expect(link.forModel).not.toContain("ugc_");
  });

  it("redeems a join link as an application, once", async () => {
    const created = await openBrief();
    const link = await issueJoinLink(MEMBER, created);
    await saveCreatorProfile(CREATOR, profile());
    const first = await redeemJoinToken(CREATOR, link.payload);
    const second = await redeemJoinToken(CREATOR, link.payload);
    expect(first.status).toBe("applied");
    expect(second.inviteId).toBe(first.inviteId);
    expect(store.tokens[0]?.tokenHash).toBe(
      hashJoinToken(link.payload.slice(4)),
    );
    expect(store.tokens.some((row) => JSON.stringify(row).includes(link.payload))).toBe(
      false,
    );
  });

  it("routes ugc_ away from the login greeting and leaves other payloads there", () => {
    expect(ugcTokenFromStart("ugc_abc")).toBe("abc");
    expect(ugcTokenFromStart(`ugc_${"a".repeat(80)}`)).toBeNull();
    expect(ugcTokenFromStart("ugc_bad token")).toBeNull();
    expect(startPayloadRoute("ugc_abc")).toBe("ugc");
    expect(startPayloadRoute("")).toBe("login");
    expect(startPayloadRoute("hello")).toBe("login");
    expect(startPayloadRoute("login_abcdefghijklmnopqrstuv")).toBe("login");
  });

  it("uses one create function, and closing stops new applications", async () => {
    const created = await createCampaign(MEMBER, brief());
    expect(created.status).toBe("pending_review");
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    await closeCampaign(MEMBER, created.id);
    await saveCreatorProfile(CREATOR, profile());
    await expect(applyToCampaign(CREATOR, created.id)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("declines an invite without hiring", async () => {
    const created = await openBrief();
    await saveCreatorProfile(CREATOR, profile());
    const offer = await offerHire(MEMBER, created, CREATOR);
    const declined = await declineInvite(CREATOR, offer.inviteId);
    expect(declined.status).toBe("declined");
  });
});

async function openBrief() {
  const created = await createCampaign(MEMBER, brief());
  await decideCampaign({
    adminId: ADMIN,
    isAdmin: true,
    campaignId: created.id,
    to: "open",
  });
  return created.id;
}
