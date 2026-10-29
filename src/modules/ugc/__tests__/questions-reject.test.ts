import { beforeEach, describe, expect, it } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import {
  applyToCampaign,
  createCampaign,
  decideCampaign,
  listOpenCampaigns,
  offerHire,
  readCampaign,
  rejectApplication,
  saveCreatorProfile,
  updateCampaignText,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput } from "../service/records";
import { cleanAnswers, cleanQuestions } from "../service/questions";

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

describe("question and answer rules", () => {
  it("keeps up to three filled questions, without contacts", () => {
    expect(cleanQuestions([" One? ", "", "Two?"])).toEqual(["One?", "Two?"]);
    expect(() => cleanQuestions(["a", "b", "c", "d"])).toThrow();
    expect(() => cleanQuestions(["x".repeat(201)])).toThrow();
    expect(() => cleanQuestions(["write to me@example.com"])).toThrow();
  });

  it("needs one answer per question and none when there are no questions", () => {
    expect(cleanAnswers([], ["ignored"])).toEqual([]);
    expect(cleanAnswers(["Q1", "Q2"], [" a ", "b"])).toEqual(["a", "b"]);
    expect(() => cleanAnswers(["Q1"], undefined)).toThrow();
    expect(() => cleanAnswers(["Q1", "Q2"], ["a"])).toThrow();
    expect(() => cleanAnswers(["Q1"], [""])).toThrow();
    expect(() => cleanAnswers(["Q1"], ["me@example.com"])).toThrow();
  });
});

describe("brief questions and turning an application down (U3б)", () => {
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

  it("applies without questions as before", async () => {
    const result = await applyToCampaign(CREATOR, campaignId);
    expect(result.status).toBe("applied");
    expect((await store.getInvite(result.inviteId))?.answers).toEqual([]);
  });

  it("asks the questions, requires the answers and shows them to the company", async () => {
    await updateCampaignText(MEMBER, campaignId, {
      questions: ["Have you made app videos?", "Which phone do you film on?"],
    });
    expect((await listOpenCampaigns(CREATOR))[0].questions).toHaveLength(2);
    await expect(applyToCampaign(CREATOR, campaignId)).rejects.toMatchObject({
      status: 400,
    });
    const result = await applyToCampaign(CREATOR, campaignId, [
      "Yes, three",
      "An iPhone",
    ]);
    const view = await readCampaign(MEMBER, campaignId);
    if (view.role !== "company") throw new Error("role");
    expect(view.brief.questions).toHaveLength(2);
    expect(view.participants[0].answers).toEqual(["Yes, three", "An iPhone"]);
    expect(result.status).toBe("applied");
  });

  it("does not change the terms of an offer when only questions change", async () => {
    await applyToCampaign(CREATOR, campaignId);
    const offer = await offerHire(MEMBER, campaignId, CREATOR);
    await updateCampaignText(MEMBER, campaignId, { questions: ["New?"] });
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.invite.termsChanged).toBe(false);
    expect(offer.inviteId).toBe(view.invite.id);
  });

  it("turns an application down with a reason, tells the creator and drops the shortlist mark", async () => {
    const { inviteId } = await applyToCampaign(CREATOR, campaignId);
    const invite = (await store.getInvite(inviteId))!;
    invite.shortlisted = true;
    await store.saveInvite(invite);
    const before = store.notices?.length ?? 0;
    expect(await rejectApplication(MEMBER, inviteId, "filled")).toMatchObject({
      status: "declined",
      reason: "filled",
    });
    const saved = await store.getInvite(inviteId);
    expect(saved).toMatchObject({
      status: "declined",
      declineReason: "filled",
      shortlisted: false,
    });
    expect((store.notices?.length ?? 0) - before).toBe(1);
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.invite.declineReason).toBe("filled");
  });

  it("refuses a reason outside the list, strangers, creators and offers", async () => {
    const { inviteId } = await applyToCampaign(CREATOR, campaignId);
    await expect(
      rejectApplication(MEMBER, inviteId, "because" as never),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      rejectApplication(STRANGER, inviteId, "other"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      rejectApplication(CREATOR, inviteId, "other"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      rejectApplication(null, inviteId, "other"),
    ).rejects.toMatchObject({ status: 401 });
    await offerHire(MEMBER, campaignId, CREATOR);
    await expect(
      rejectApplication(MEMBER, inviteId, "other"),
    ).rejects.toMatchObject({ status: 409 });
  });
});
