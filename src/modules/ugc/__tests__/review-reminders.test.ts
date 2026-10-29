import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

import {
  acceptInvite,
  applyToCampaign,
  createCampaign,
  decideCampaign,
  offerHire,
  postUgcRoomMessage,
  readCampaign,
  remindReviews,
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
const ADMIN = "00000000-0000-4000-8000-000000000004";
const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];

// 2026-10-26 is a Monday.
const SENT = new Date("2026-10-26T10:00:00.000Z");

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

describe("review reminders and room notices (U4б, D574)", () => {
  let store: MemoryUgcStore;
  let notices: UgcNotice[];
  let audits: string[];
  let now: Date;
  let campaignId: string;
  let inviteId: string;

  beforeEach(async () => {
    store = new MemoryUgcStore();
    notices = [];
    audits = [];
    now = SENT;
    store.now = () => now;
    store.notify = async (notice) => {
      notices.push(notice);
    };
    store.audit = async (_actor, action) => {
      audits.push(action);
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
    await submitVideo(
      CREATOR,
      inviteId,
      "https://www.tiktok.com/@a/video/1",
      "Hook",
    );
    notices.length = 0;
  });

  const stageNotices = () =>
    notices.filter((row) => row.type === "ugc.review_due");

  it("starts the clock when the video is sent and shows the due date", async () => {
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.submission?.reviewDueAt).toBe("2026-11-02T10:00:00.000Z");
  });

  it("reminds on the third business day, then on the last day, then escalates", async () => {
    now = new Date("2026-10-28T12:00:00.000Z");
    expect(await remindReviews(store)).toEqual({ reminded: 0, escalated: 0 });

    now = new Date("2026-10-29T10:00:00.000Z");
    expect(await remindReviews(store)).toEqual({ reminded: 1, escalated: 0 });
    expect(stageNotices()[0].payload.stage).toBe("reminder");
    expect(stageNotices()[0].userIds).toEqual([MEMBER]);

    // The same stage is not sent twice.
    expect(await remindReviews(store)).toEqual({ reminded: 0, escalated: 0 });

    now = new Date("2026-10-30T10:00:00.000Z");
    await remindReviews(store);
    expect(stageNotices()[1].payload.stage).toBe("last_day");

    now = new Date("2026-11-02T10:00:00.000Z");
    expect(await remindReviews(store)).toEqual({ reminded: 1, escalated: 1 });
    expect(stageNotices()[2].payload.stage).toBe("overdue");
    expect(audits).toContain("ugc.review_escalated");
    const saved = await store.getSubmission(inviteId);
    expect(saved?.escalatedAt).toEqual(now);
    expect(saved?.status).toBe("submitted");
  });

  it("sends only the latest stage when a check was missed", async () => {
    now = new Date("2026-11-03T10:00:00.000Z");
    expect(await remindReviews(store)).toEqual({ reminded: 1, escalated: 1 });
    expect(stageNotices().map((row) => row.payload.stage)).toEqual(["overdue"]);
  });

  it("never accepts the video by silence", async () => {
    now = new Date("2026-12-31T10:00:00.000Z");
    await remindReviews(store);
    expect((await store.getSubmission(inviteId))?.status).toBe("submitted");
    expect(
      (await store.getPayoutBySubmission(
        (await store.getSubmission(inviteId))!.id,
      )) ?? null,
    ).toBeNull();
  });

  it("restarts the clock for a corrected video", async () => {
    await requestChanges(MEMBER, inviteId, "Please shorten it");
    notices.length = 0;
    now = new Date("2026-10-29T10:00:00.000Z");
    expect(await remindReviews(store)).toEqual({ reminded: 0, escalated: 0 });
    await submitVideo(
      CREATOR,
      inviteId,
      "https://www.tiktok.com/@a/video/2",
      "Hook 2",
    );
    const view = await readCampaign(CREATOR, campaignId);
    if (view.role !== "creator") throw new Error("role");
    expect(view.submission?.reviewDueAt).toBe("2026-11-05T10:00:00.000Z");
    expect(await remindReviews(store)).toEqual({ reminded: 0, escalated: 0 });
  });

  it("does not remind about a video that was already decided", async () => {
    const submission = (await store.getSubmission(inviteId))!;
    submission.status = "accepted";
    await store.saveSubmission(submission);
    now = new Date("2026-11-10T10:00:00.000Z");
    expect(await remindReviews(store)).toEqual({ reminded: 0, escalated: 0 });
  });

  it("tells the other side about a room message, not the writer", async () => {
    await postUgcRoomMessage(CREATOR, inviteId, "Quick question");
    const toCompany = notices.find((row) => row.type === "ugc.message")!;
    expect(toCompany.userIds).toEqual([MEMBER]);
    notices.length = 0;
    await postUgcRoomMessage(MEMBER, inviteId, "Go ahead");
    const toCreator = notices.find((row) => row.type === "ugc.message")!;
    expect(toCreator.userIds).toEqual([CREATOR]);
    expect(toCreator.email).toBe(false);
  });
});
