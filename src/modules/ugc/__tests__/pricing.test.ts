import { beforeEach, describe, expect, it } from "vitest";
import {
  applyToCampaign,
  createCampaign,
  decideCampaign,
  listMyCampaignSummaries,
  saveCreatorProfile,
  ugcPriceGuide,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import {
  priceGuide,
  rewardInLimits,
  ugcBudgetMinor,
  UGC_PRICE_PRESETS,
  usdLabel,
} from "../service/pricing";
import {
  campaignProgress,
  countParticipants,
  emptyCounts,
  stepIndex,
} from "../service/progress";
import { priceGuideForModel } from "../service/bot-tools";
import type { BriefInput } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const ADMIN = "00000000-0000-4000-8000-000000000004";

function brief(
  bountyMinor: number,
  over: Partial<BriefInput> = {},
): BriefInput {
  return {
    companyId: COMPANY,
    productName: "North",
    productSummary: "A small app",
    goal: "awareness",
    niches: ["app"],
    audience: "People who try new apps",
    country: null,
    languages: ["en"],
    mustSay: "Say the name",
    mustNot: "Do not promise income",
    platforms: ["tiktok"],
    videosWanted: 4,
    bountyMinor: BigInt(bountyMinor),
    deadline: "2099-10-20",
    rights: "organic",
    pitch: "",
    exampleUrls: [],
    ...over,
  };
}

describe("UGC price guide (D464)", () => {
  it("falls back to the ready amounts below three reviewed briefs", () => {
    const guide = priceGuide([
      { bountyMinor: BigInt(4000), niches: ["app"], platforms: ["tiktok"] },
    ]);
    expect(guide).toMatchObject({
      source: "presets",
      medianMinor: 5000,
      minMinor: 2500,
      maxMinor: 20000,
    });
    expect(guide.presets).toEqual(UGC_PRICE_PRESETS);
  });

  it("uses min, median and max of matching briefs", () => {
    const rows = [3000, 5000, 7000, 90000].map((price, index) => ({
      bountyMinor: BigInt(price),
      niches: index === 3 ? ["game"] : ["app"],
      platforms: ["tiktok"],
    }));
    expect(priceGuide(rows, { niche: "app" })).toMatchObject({
      source: "briefs",
      count: 3,
      minMinor: 3000,
      medianMinor: 5000,
      maxMinor: 7000,
    });
    expect(priceGuide(rows, { niche: "app", platform: "reels" }).source).toBe(
      "presets",
    );
  });

  it("counts the budget and the limits", () => {
    expect(ugcBudgetMinor(5, 5000)).toBe(25000);
    expect(ugcBudgetMinor(0, 5000)).toBe(0);
    expect(rewardInLimits(500)).toBe(true);
    expect(rewardInLimits(50001)).toBe(false);
    expect(usdLabel(5000)).toBe("$50");
    expect(usdLabel(5050)).toBe("$50.50");
  });

  it("tells the model only the guide's amounts", () => {
    const text = priceGuideForModel(priceGuide([]));
    expect(text).toContain("$25, $50, $100, $200");
    expect(text).toContain("Name only these amounts");
  });
});

describe("UGC step track (D464)", () => {
  it("moves from review to responses, hire, videos and decision", () => {
    const counts = emptyCounts();
    expect(campaignProgress("pending_review", counts).step).toBe("review");
    expect(campaignProgress("open", counts).step).toBe("responses");
    expect(campaignProgress("open", { ...counts, applied: 2 })).toMatchObject({
      step: "hire",
      next: "hire",
    });
    expect(campaignProgress("open", { ...counts, hired: 1 })).toMatchObject({
      step: "videos",
      next: "remind",
    });
    expect(
      campaignProgress("open", { ...counts, hired: 1, waiting: 1 }),
    ).toMatchObject({ step: "decision", next: "decide" });
    expect(campaignProgress("closed", counts).step).toBe("done");
    expect(stepIndex("done")).toBe(6);
    expect(
      countParticipants(
        [{ status: "applied" }, { status: "hired" }],
        [{ status: "submitted" }, { status: "winner" }],
      ),
    ).toMatchObject({ applied: 1, hired: 1, waiting: 1, winners: 1 });
  });
});

describe("UGC summaries and the guide on the store", () => {
  let store: MemoryUgcStore;

  beforeEach(() => {
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
  });

  it("counts only reviewed briefs and summarizes the member's briefs", async () => {
    for (const price of [3000, 6000, 9000]) {
      const created = await createCampaign(MEMBER, brief(price));
      await decideCampaign({
        adminId: ADMIN,
        isAdmin: true,
        campaignId: created.id,
        to: "open",
      });
    }
    // Still in review: not part of the guide.
    await createCampaign(MEMBER, brief(40000));
    expect(await ugcPriceGuide({ niche: "app" })).toMatchObject({
      source: "briefs",
      count: 3,
      medianMinor: 6000,
    });

    await saveCreatorProfile(CREATOR, {
      displayName: "Ada",
      languages: ["en"],
      platforms: ["tiktok"],
      niches: ["app"],
      country: null,
      exampleUrls: [],
      inviteOptIn: true,
      status: "active",
    });
    const open = (await listMyCampaignSummaries(MEMBER)).find(
      (row) => row.status === "open",
    )!;
    await applyToCampaign(CREATOR, open.id);
    const rows = await listMyCampaignSummaries(MEMBER);
    const applied = rows.find((row) => row.id === open.id)!;
    expect(applied.progress).toMatchObject({ step: "hire", next: "hire" });
    expect(applied.budgetMinor).toBe(4 * Number(applied.bountyMinor));
    expect(rows.some((row) => row.progress.step === "review")).toBe(true);
    await expect(listMyCampaignSummaries(null)).rejects.toMatchObject({
      status: 401,
    });
  });
});
