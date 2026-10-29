import { beforeEach, describe, expect, it } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import {
  createCampaign,
  decideCampaign,
  readCampaign,
  updateCampaignText,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput, Campaign } from "../service/records";
import { changedFields, textSnapshot, versionRows } from "../service/versions";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
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

const base = {
  productSummary: "S",
  pitch: "P",
  mustSay: "Y",
  mustNot: "N",
  exampleUrls: [],
  questions: [],
  createdBy: "u",
  createdAt: new Date("2026-10-01T00:00:00Z"),
} as unknown as Campaign;

describe("version rows (pure)", () => {
  it("lists changed fields in a fixed order", () => {
    const after = { ...base, mustSay: "Z", pitch: "Q", questions: ["x?"] };
    expect(changedFields(textSnapshot(base), textSnapshot(after))).toEqual([
      "pitch",
      "mustSay",
      "questions",
    ]);
  });

  it("writes nothing when no text differs", () => {
    expect(
      versionRows({
        campaignId: "c",
        existing: [],
        before: base,
        after: { ...base },
        changedBy: "m",
        at: new Date(),
        newId: () => "id",
      }),
    ).toEqual([]);
  });

  it("starts the history with the state before the first change", () => {
    let n = 0;
    const rows = versionRows({
      campaignId: "c",
      existing: [],
      before: base,
      after: { ...base, mustSay: "Z" },
      changedBy: "m",
      at: new Date("2026-10-02T00:00:00Z"),
      newId: () => `id${++n}`,
    });
    expect(rows.map((row) => row.version)).toEqual([1, 2]);
    expect(rows[0]).toMatchObject({ changedFields: [], changedBy: "u" });
    expect(rows[0].snapshot.mustSay).toBe("Y");
    expect(rows[1]).toMatchObject({
      changedFields: ["mustSay"],
      changedBy: "m",
    });
    expect(rows[1].snapshot.mustSay).toBe("Z");
  });

  it("continues the numbering", () => {
    const rows = versionRows({
      campaignId: "c",
      existing: [{ version: 1 }, { version: 4 }],
      before: base,
      after: { ...base, pitch: "Q" },
      changedBy: "m",
      at: new Date(),
      newId: () => "id",
    });
    expect(rows.map((row) => row.version)).toEqual([5]);
  });
});

describe("brief history through the service (U3б)", () => {
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
  });

  it("has no history until the first text change", async () => {
    const view = await readCampaign(MEMBER, campaignId);
    if (view.role !== "company") throw new Error("role");
    expect(view.versions).toEqual([]);
  });

  it("records each change and keeps the earlier text", async () => {
    await updateCampaignText(MEMBER, campaignId, { mustSay: "Say it twice" });
    await updateCampaignText(MEMBER, campaignId, {
      pitch: "A newer pitch",
      questions: ["Which phone?"],
    });
    const view = await readCampaign(MEMBER, campaignId);
    if (view.role !== "company") throw new Error("role");
    expect(view.versions.map((row) => row.version)).toEqual([1, 2, 3]);
    expect(view.versions[2].changedFields).toEqual(["pitch", "questions"]);
    const saved = await store.listCampaignVersions(campaignId);
    expect(saved[0].snapshot.mustSay).toBe("Say the name");
    expect(saved[1].snapshot.mustSay).toBe("Say it twice");
  });

  it("does not add a version when the saved texts are the same", async () => {
    await updateCampaignText(MEMBER, campaignId, { mustSay: "Say the name" });
    expect(await store.listCampaignVersions(campaignId)).toEqual([]);
  });

  it("shows the history to the company only", async () => {
    await updateCampaignText(MEMBER, campaignId, { mustSay: "Changed" });
    await expect(readCampaign(STRANGER, campaignId)).rejects.toMatchObject({
      status: 404,
    });
  });
});
