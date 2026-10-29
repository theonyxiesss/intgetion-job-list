import { beforeEach, describe, expect, it } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import {
  acceptInvite,
  createCampaign,
  decideCampaign,
  offerHire,
  readCampaign,
  saveCreatorProfile,
  updateCampaignText,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const ADMIN = "00000000-0000-4000-8000-000000000004";
const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];

const brief: BriefInput = {
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
  deadline: "2099-10-20",
  rights: "ads",
  pitch: "We would like a short video",
  exampleUrls: [],
};

describe("terms snapshot on the offer (U3, D574)", () => {
  let store: MemoryUgcStore;
  let campaignId: string;

  beforeEach(async () => {
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
    const created = await createCampaign(MEMBER, brief);
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    campaignId = created.id;
    await saveCreatorProfile(CREATOR, {
      displayName: "Ada",
      languages: ["en"],
      platforms,
      niches,
      country: null,
      exampleUrls: [],
      inviteOptIn: true,
      status: "active",
    });
  });

  it("stores the terms with the offer and shows them to the creator", async () => {
    await offerHire(MEMBER, campaignId, CREATOR);
    const view = await readCampaign(CREATOR, campaignId);
    expect(view.role).toBe("creator");
    if (view.role !== "creator") return;
    expect(view.invite.terms).toMatchObject({
      bountyMinor: "1500",
      licenseMonths: 6,
      reviewBusinessDays: 5,
      mustSay: "Say the name",
    });
    expect(view.invite.termsHash).toHaveLength(64);
    expect(view.invite.termsChanged).toBe(false);
    expect(view.invite.agreedAt).toBeNull();
  });

  it("records the agreement when the creator accepts what the page showed", async () => {
    const offer = await offerHire(MEMBER, campaignId, CREATOR);
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    await acceptInvite(CREATOR, offer.inviteId, view.invite.termsHash!);
    const saved = await store.getInvite(offer.inviteId);
    expect(saved?.status).toBe("hired");
    expect(saved?.agreedHash).toBe(saved?.termsHash);
    expect(saved?.agreedAt).toBeInstanceOf(Date);
  });

  it("refuses a hash that is not the offer's", async () => {
    const offer = await offerHire(MEMBER, campaignId, CREATOR);
    await expect(
      acceptInvite(CREATOR, offer.inviteId, "a".repeat(64)),
    ).rejects.toMatchObject({ status: 409, code: "UGC_TERMS_MISMATCH" });
    expect((await store.getInvite(offer.inviteId))?.status).toBe("offered");
  });

  it("blocks acceptance after the brief texts changed, until the offer is sent again", async () => {
    const offer = await offerHire(MEMBER, campaignId, CREATOR);
    await updateCampaignText(MEMBER, campaignId, { mustSay: "Say it twice" });
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.invite.termsChanged).toBe(true);
    await expect(acceptInvite(CREATOR, offer.inviteId)).rejects.toMatchObject({
      status: 409,
      code: "UGC_TERMS_CHANGED",
    });

    const again = await offerHire(MEMBER, campaignId, CREATOR);
    expect(again.inviteId).toBe(offer.inviteId);
    const fresh = await readCampaign(CREATOR, campaignId);
    if (fresh.role !== "creator") throw new Error("role");
    expect(fresh.invite.termsChanged).toBe(false);
    expect(fresh.invite.terms?.mustSay).toBe("Say it twice");
    await acceptInvite(CREATOR, offer.inviteId, fresh.invite.termsHash!);
    expect((await store.getInvite(offer.inviteId))?.status).toBe("hired");
  });

  it("does not let a company resend an unchanged offer", async () => {
    await offerHire(MEMBER, campaignId, CREATOR);
    await expect(offerHire(MEMBER, campaignId, CREATOR)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("accepts an offer made before U3 that has no snapshot", async () => {
    const offer = await offerHire(MEMBER, campaignId, CREATOR);
    const old = (await store.getInvite(offer.inviteId))!;
    old.terms = null;
    old.termsHash = null;
    await store.saveInvite(old);
    await updateCampaignText(MEMBER, campaignId, { mustSay: "Changed" });
    await acceptInvite(CREATOR, offer.inviteId);
    const saved = await store.getInvite(offer.inviteId);
    expect(saved?.status).toBe("hired");
    expect(saved?.agreedAt ?? null).toBeNull();
  });
});
