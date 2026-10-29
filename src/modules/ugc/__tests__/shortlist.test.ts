import { beforeEach, describe, expect, it } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import {
  applyToCampaign,
  createCampaign,
  decideCampaign,
  offerHire,
  readCampaign,
  saveCreatorProfile,
  setShortlist,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const STRANGER = "00000000-0000-4000-8000-000000000009";
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

describe("shortlist (U3б, TZ 48 §6)", () => {
  let store: MemoryUgcStore;
  let campaignId: string;
  let inviteId: string;

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
    inviteId = (await applyToCampaign(CREATOR, campaignId)).inviteId;
  });

  it("marks and unmarks an application for the company only", async () => {
    expect(await setShortlist(MEMBER, inviteId, true)).toEqual({
      inviteId,
      shortlisted: true,
    });
    const company = await readCampaign(MEMBER, campaignId);
    if (company.role !== "company") throw new Error("role");
    expect(company.participants[0].shortlisted).toBe(true);
    await setShortlist(MEMBER, inviteId, false);
    const again = await readCampaign(MEMBER, campaignId);
    if (again.role !== "company") throw new Error("role");
    expect(again.participants[0].shortlisted).toBe(false);
  });

  it("is invisible to the creator and sends no notice", async () => {
    const before = store.notices?.length ?? 0;
    await setShortlist(MEMBER, inviteId, true);
    expect(store.notices?.length ?? 0).toBe(before);
    const view = await readCampaign(CREATOR, campaignId);
    expect(JSON.stringify(view)).not.toContain("shortlist");
  });

  it("refuses strangers, creators and guests", async () => {
    await expect(setShortlist(STRANGER, inviteId, true)).rejects.toMatchObject({
      status: 404,
    });
    await expect(setShortlist(CREATOR, inviteId, true)).rejects.toMatchObject({
      status: 404,
    });
    await expect(setShortlist(null, inviteId, true)).rejects.toMatchObject({
      status: 401,
    });
    expect((await store.getInvite(inviteId))?.shortlisted).toBeFalsy();
  });

  it("only applications can be marked, not offers", async () => {
    await offerHire(MEMBER, campaignId, CREATOR);
    await expect(setShortlist(MEMBER, inviteId, true)).rejects.toMatchObject({
      status: 409,
    });
  });
});
