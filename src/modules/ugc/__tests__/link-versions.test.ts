import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

import {
  acceptInvite,
  applyToCampaign,
  createCampaign,
  decideCampaign,
  decideSubmission,
  offerHire,
  readCampaign,
  reportBrokenLink,
  requestChanges,
  saveCreatorProfile,
  submitVideo,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput, UgcNotice } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const STRANGER = "00000000-0000-4000-8000-000000000009";
const ADMIN = "00000000-0000-4000-8000-000000000004";
const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];
const URL1 = "https://www.tiktok.com/@a/video/1";
const URL2 = "https://www.tiktok.com/@a/video/2";
const URL3 = "https://www.tiktok.com/@a/video/3";

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

describe("video links: versions, snapshot, broken link (U5, D573)", () => {
  let store: MemoryUgcStore;
  let notices: UgcNotice[];
  let campaignId: string;
  let inviteId: string;

  beforeEach(async () => {
    store = new MemoryUgcStore();
    notices = [];
    store.notify = async (notice) => {
      notices.push(notice);
    };
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
    await applyToCampaign(CREATOR, campaignId);
    inviteId = (await offerHire(MEMBER, campaignId, CREATOR)).inviteId;
    await acceptInvite(CREATOR, inviteId);
  });

  async function versions() {
    const submission = (await store.getSubmission(inviteId))!;
    return store.listSubmissionVersions(submission.id);
  }

  it("keeps the first link as version 1", async () => {
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    expect((await versions()).map((row) => [row.version, row.url])).toEqual([
      [1, URL1],
    ]);
  });

  it("keeps the old link when the creator sends the corrected video", async () => {
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    await requestChanges(MEMBER, inviteId, "Shorter please");
    await submitVideo(CREATOR, inviteId, URL2, "Hook 2");
    expect((await versions()).map((row) => [row.version, row.url])).toEqual([
      [1, URL1],
      [2, URL2],
    ]);
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.linkVersions.map((row) => row.url)).toEqual([URL1, URL2]);
    const company = await readCampaign(MEMBER, campaignId);
    if (company.role !== "company") throw new Error("role");
    expect(company.participants[0].linkVersions).toHaveLength(2);
  });

  it("marks the link the company accepted and does not rewrite it later", async () => {
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    await decideSubmission(MEMBER, inviteId, "accepted");
    const rows = await versions();
    expect(rows[0].acceptedAt).toBeInstanceOf(Date);
    await expect(
      submitVideo(CREATOR, inviteId, URL3, "Late"),
    ).rejects.toMatchObject({ status: 409 });
    expect((await versions()).map((row) => row.url)).toEqual([URL1]);
  });

  it("lets the company say the link does not open, once, and tells the creator", async () => {
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    notices.length = 0;
    expect(await reportBrokenLink(MEMBER, inviteId)).toMatchObject({
      linkReported: true,
    });
    const note = notices.find((row) => row.type === "ugc.submission_decided")!;
    expect(note.userIds).toEqual([CREATOR]);
    expect(note.payload.decision).toBe("link_broken");
    await expect(reportBrokenLink(MEMBER, inviteId)).rejects.toMatchObject({
      status: 409,
    });
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.submission?.linkReported).toBe(true);
  });

  it("takes a new link after the report without using the included revision", async () => {
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    await reportBrokenLink(MEMBER, inviteId);
    await submitVideo(CREATOR, inviteId, URL2, "Hook");
    const submission = (await store.getSubmission(inviteId))!;
    expect(submission).toMatchObject({
      status: "submitted",
      url: URL2,
      linkReportedAt: null,
    });
    expect((await store.getInvite(inviteId))?.revisionUsed).toBe(false);
    expect((await versions()).map((row) => row.url)).toEqual([URL1, URL2]);
    // The company may still ask for its one revision afterwards.
    await requestChanges(MEMBER, inviteId, "Shorter please");
  });

  it("refuses a second link when nothing was reported", async () => {
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    await expect(
      submitVideo(CREATOR, inviteId, URL2, "Again"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("refuses strangers, creators and videos without a waiting link", async () => {
    await expect(reportBrokenLink(MEMBER, inviteId)).rejects.toMatchObject({
      status: 409,
    });
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    await expect(reportBrokenLink(STRANGER, inviteId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(reportBrokenLink(CREATOR, inviteId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(reportBrokenLink(null, inviteId)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("starts the history from the old link of a video sent before 0081", async () => {
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    store.submissionVersions = [];
    await reportBrokenLink(MEMBER, inviteId);
    await submitVideo(CREATOR, inviteId, URL2, "Hook");
    expect((await versions()).map((row) => [row.version, row.url])).toEqual([
      [1, URL1],
      [2, URL2],
    ]);
  });

  it("works before migration 0081: no history, no error", async () => {
    const missing = Object.assign(new Error("no table"), { code: "42P01" });
    store.listSubmissionVersions = async () => {
      throw missing;
    };
    store.listSubmissionVersionsFor = async () => {
      throw missing;
    };
    store.insertSubmissionVersion = async () => {
      throw missing;
    };
    store.markSubmissionVersionAccepted = async () => {
      throw missing;
    };
    await submitVideo(CREATOR, inviteId, URL1, "Hook");
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.linkVersions).toEqual([]);
    await decideSubmission(MEMBER, inviteId, "accepted");
    expect((await store.getSubmission(inviteId))?.status).toBe("accepted");
  });
});
