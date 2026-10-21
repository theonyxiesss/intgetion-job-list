import { beforeEach, describe, expect, it } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import { HttpError } from "@/lib/http";
import { ugcTools } from "../service/bot-tools";
import {
  acceptInvite,
  applyToCampaign,
  createCampaign,
  decideCampaign,
  offerHire,
  saveCreatorProfile,
  setCampaignPaused,
  submitVideo,
  updateCampaignText,
  useUgcStore,
  withdrawCampaign,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput, ProfileInput } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const OTHER = "00000000-0000-4000-8000-000000000005";
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
    deadline: "2099-10-20",
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

type TestTool = {
  confirm: () => boolean;
  preview: (ctx: unknown, input: unknown) => Promise<string>;
  run: (ctx: unknown, input: unknown) => Promise<{ llm: string }>;
};

function tool(name: string): TestTool {
  const found = ugcTools.find((row) => row.name === name);
  if (!found) throw new Error(name);
  return found as unknown as TestTool;
}

const ctx = (userId: string) => ({ userId, state: {}, locale: "ru" });

describe("brief pause, text edit and withdraw (D512)", () => {
  let store: MemoryUgcStore;

  beforeEach(() => {
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
  });

  async function opened() {
    const created = await createCampaign(MEMBER, brief());
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    return created.id;
  }

  it("pauses: no new applications or hires, hired creators still hand in videos", async () => {
    const id = await opened();
    await saveCreatorProfile(CREATOR, profile());
    const offer = await offerHire(MEMBER, id, CREATOR);
    await acceptInvite(CREATOR, offer.inviteId);

    expect(await setCampaignPaused(MEMBER, id, true)).toEqual({
      status: "paused",
      productName: "North",
    });
    await saveCreatorProfile(OTHER, profile({ displayName: "Bo" }));
    await expect(applyToCampaign(OTHER, id)).rejects.toBeInstanceOf(HttpError);
    await expect(offerHire(MEMBER, id, OTHER)).rejects.toBeInstanceOf(
      HttpError,
    );
    await expect(
      submitVideo(CREATOR, offer.inviteId, "https://www.tiktok.com/v/1", ""),
    ).resolves.toBeTruthy();

    expect((await setCampaignPaused(MEMBER, id, false)).status).toBe("open");
    expect(store.audits.map((row) => row.action)).toEqual(
      expect.arrayContaining(["ugc.campaign_pause", "ugc.campaign_resume"]),
    );
  });

  it("does not pause a brief in review or another company's brief", async () => {
    const created = await createCampaign(MEMBER, brief());
    await expect(
      setCampaignPaused(MEMBER, created.id, true),
    ).rejects.toMatchObject({ status: 409 });
    const id = await opened();
    await expect(setCampaignPaused(OTHER, id, true)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("changes only the named texts and keeps the terms", async () => {
    const id = await opened();
    await updateCampaignText(MEMBER, id, {
      pitch: "A new pitch",
      exampleUrls: ["https://example.com/a"],
    });
    const row = store.campaigns.get(id)!;
    expect(row.pitch).toBe("A new pitch");
    expect(row.exampleUrls).toEqual(["https://example.com/a"]);
    expect(row.productSummary).toBe("A small app");
    expect(row.bountyMinor).toBe(BigInt(1500));
    expect(row.videosWanted).toBe(2);
  });

  it("refuses empty, too long, contact-bearing or not-open text changes", async () => {
    const id = await opened();
    await expect(updateCampaignText(MEMBER, id, {})).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      updateCampaignText(MEMBER, id, { productSummary: "x".repeat(401) }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      updateCampaignText(MEMBER, id, { mustSay: " " }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      updateCampaignText(MEMBER, id, { pitch: "write me at a@b.co" }),
    ).rejects.toBeInstanceOf(HttpError);
    const inReview = await createCampaign(MEMBER, brief());
    await expect(
      updateCampaignText(MEMBER, inReview.id, { pitch: "x" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("takes a brief in review back: the draft is written first, then the brief goes", async () => {
    const created = await createCampaign(MEMBER, brief());
    const seen: string[] = [];
    const result = await withdrawCampaign(MEMBER, created.id, async (row) => {
      seen.push(row.productName);
      expect(store.campaigns.has(created.id)).toBe(true);
    });
    expect(result).toEqual({ status: "draft", productName: "North" });
    expect(seen).toEqual(["North"]);
    expect(store.campaigns.has(created.id)).toBe(false);
  });

  it("keeps the brief when the draft cannot be written, and refuses an open brief", async () => {
    const created = await createCampaign(MEMBER, brief());
    await expect(
      withdrawCampaign(MEMBER, created.id, async () => {
        throw new HttpError(409, "UGC_DRAFT_IN_PROGRESS", "draft");
      }),
    ).rejects.toMatchObject({ code: "UGC_DRAFT_IN_PROGRESS" });
    expect(store.campaigns.has(created.id)).toBe(true);

    const id = await opened();
    await expect(
      withdrawCampaign(MEMBER, id, async () => {}),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      withdrawCampaign(OTHER, created.id, async () => {}),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("Spoki: each new skill is a card with the product name; a creator gets 404", async () => {
    const id = await opened();
    const inReview = (await createCampaign(MEMBER, brief())).id;
    for (const [name, campaignId, extra] of [
      ["set_ugc_status", id, { action: "pause" }],
      ["propose_ugc_update", id, {}],
      ["withdraw_ugc_campaign", inReview, {}],
    ] as const) {
      expect(tool(name).confirm()).toBe(true);
      await expect(
        tool(name).preview(ctx(MEMBER), { campaignId, ...extra }),
      ).resolves.toBe("North");
    }
    await saveCreatorProfile(CREATOR, profile());
    await applyToCampaign(CREATOR, id);
    await expect(
      tool("set_ugc_status").preview(ctx(CREATOR), {
        campaignId: id,
        action: "pause",
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(ugcTools.some((row) => row.name === "close_ugc_campaign")).toBe(
      false,
    );
  });

  it("Spoki: no card for a change the brief's status refuses (D515)", async () => {
    const inReview = (await createCampaign(MEMBER, brief())).id;
    const preview = (name: string, input: object) =>
      tool(name).preview(ctx(MEMBER), { campaignId: inReview, ...input });
    for (const action of ["pause", "resume", "close"]) {
      const error = await preview("set_ugc_status", { action }).catch(
        (thrown: unknown) => thrown,
      );
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({ status: 409, code: "INVALID_TRANSITION" });
      expect((error as HttpError).message).toContain("withdraw_ugc_campaign");
    }
    await expect(preview("propose_ugc_update", {})).rejects.toMatchObject({
      status: 409,
    });
    const id = await opened();
    await expect(
      tool("withdraw_ugc_campaign").preview(ctx(MEMBER), { campaignId: id }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      tool("set_ugc_status").preview(ctx(MEMBER), {
        campaignId: id,
        action: "resume",
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      tool("set_ugc_status").preview(ctx(MEMBER), {
        campaignId: id,
        action: "close",
      }),
    ).resolves.toBe("North");
  });

  it("Spoki: pause, resume and close go through the same service rules", async () => {
    const id = await opened();
    const run = (action: string) =>
      tool("set_ugc_status").run(ctx(MEMBER), { campaignId: id, action });
    expect((await run("pause")).llm).toContain("paused");
    expect((await run("resume")).llm).toContain("open");
    expect((await run("close")).llm).toContain("closed");
    await expect(run("resume")).rejects.toMatchObject({ status: 409 });
    await expect(
      tool("propose_ugc_update").run(ctx(MEMBER), {
        campaignId: id,
        mustNot: "No medical claims",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
