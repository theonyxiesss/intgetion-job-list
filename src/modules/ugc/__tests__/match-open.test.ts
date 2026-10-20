import { beforeEach, describe, expect, it } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import {
  applyToCampaign,
  createCampaign,
  decideCampaign,
  matchOpenCampaigns,
  saveCreatorProfile,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput, ProfileInput } from "../service/records";
import { fitReasons } from "../service/rules";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const ADMIN = "00000000-0000-4000-8000-000000000004";

function brief(over: Partial<BriefInput> = {}): BriefInput {
  return {
    companyId: COMPANY,
    productName: "North",
    productSummary: "A small app",
    goal: "awareness",
    niches: ["app"] as UgcNiche[],
    audience: "People who try new apps",
    country: null,
    languages: ["en"],
    mustSay: "Say the name",
    mustNot: "Do not promise income",
    platforms: ["tiktok"] as UgcPlatform[],
    videosWanted: 2,
    bountyMinor: BigInt(1500),
    deadline: "2026-10-30",
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
    platforms: ["tiktok"],
    niches: ["app"],
    country: "PL",
    exampleUrls: [],
    inviteOptIn: false,
    status: "active",
    ...over,
  };
}

let store: MemoryUgcStore;

/** One brief per hour and a bit: the hourly draft limit is the site's (27.13). */
async function open(over: Partial<BriefInput> = {}) {
  store.clock = new Date(store.clock.getTime() + 61 * 60 * 1000);
  const created = await createCampaign(MEMBER, brief(over));
  await decideCampaign({
    adminId: ADMIN,
    isAdmin: true,
    campaignId: created.id,
    to: "open",
  });
  return created.id;
}

describe("open briefs that fit a creator (D499)", () => {
  beforeEach(() => {
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
  });

  it("asks for a profile before matching", async () => {
    await open();
    expect(await matchOpenCampaigns(CREATOR)).toEqual({
      profileReady: false,
      openTotal: 0,
      briefs: [],
    });
  });

  it("keeps only briefs that share platform, language, niche and country", async () => {
    const fits = await open({ productName: "Fits" });
    await open({ productName: "Other niche", niches: ["finance"] });
    await open({ productName: "Other language", languages: ["de"] });
    await open({ productName: "Other platform", platforms: ["shorts"] });
    await open({ productName: "Other country", countries: ["DE"] });
    const inPoland = await open({ productName: "Poland", countries: ["PL"] });
    await saveCreatorProfile(CREATOR, profile());

    const result = await matchOpenCampaigns(CREATOR);
    expect(result.openTotal).toBe(6);
    expect(result.briefs.map((b) => b.id).sort()).toEqual(
      [fits, inPoland].sort(),
    );
    const poland = result.briefs.find((b) => b.id === inPoland)!;
    expect(poland.why).toEqual({
      platforms: ["tiktok"],
      languages: ["en"],
      niches: ["app"],
      country: "PL",
    });
    expect(result.briefs.find((b) => b.id === fits)!.why?.country).toBe("any");

    const all = await matchOpenCampaigns(CREATOR, { all: true });
    expect(all.briefs).toHaveLength(6);
  });

  it("puts more shared niches first, then the nearer deadline, then the higher reward", async () => {
    const late = await open({ deadline: "2026-10-29" });
    const early = await open({ deadline: "2026-10-20" });
    const rich = await open({
      deadline: "2026-10-29",
      bountyMinor: BigInt(5000),
    });
    const twoNiches = await open({
      deadline: "2026-10-30",
      niches: ["app", "game"],
    });
    await saveCreatorProfile(
      CREATOR,
      profile({ niches: ["app", "game"] as UgcNiche[] }),
    );
    const ids = (await matchOpenCampaigns(CREATOR)).briefs.map((b) => b.id);
    expect(ids).toEqual([twoNiches, early, rich, late]);
  });

  it("skips briefs already joined and past the deadline, and lists at most 10", async () => {
    const joined = await open();
    await open({ deadline: "2026-10-17" });
    for (let i = 0; i < 11; i += 1) await open();
    store.clock = new Date("2026-10-18T00:00:00.000Z");
    await saveCreatorProfile(CREATOR, profile());
    await applyToCampaign(CREATOR, joined);
    const result = await matchOpenCampaigns(CREATOR);
    expect(result.briefs).toHaveLength(10);
    expect(result.briefs.map((b) => b.id)).not.toContain(joined);
    expect(result.openTotal).toBe(11);
  });

  it("explains a fit the same way creatorMatches decides it", () => {
    const side = {
      platforms: ["tiktok"] as UgcPlatform[],
      languages: ["en", "ru"],
      niches: ["app"] as UgcNiche[],
      country: null,
    };
    expect(
      fitReasons(side, { ...side, languages: ["ru"], country: "PL" }),
    ).toEqual({
      platforms: ["tiktok"],
      languages: ["ru"],
      niches: ["app"],
      country: "any",
    });
    expect(
      fitReasons({ ...side, countries: ["DE"] }, { ...side, country: "PL" }),
    ).toBeNull();
    expect(fitReasons(side, { ...side, niches: [] })).toBeNull();
  });
});
