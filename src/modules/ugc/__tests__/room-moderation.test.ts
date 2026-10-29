import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

import {
  acceptInvite,
  applyToCampaign,
  createCampaign,
  decideCampaign,
  decideRoomReport,
  getUgcRoom,
  listEscalatedReviews,
  listRoomReportQueue,
  offerHire,
  postUgcRoomMessage,
  remindReviews,
  reportRoomMessage,
  saveCreatorProfile,
  submitVideo,
  sweepRoomMessages,
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

describe("room complaints, retention and escalations (U4б, D574)", () => {
  let store: MemoryUgcStore;
  let now: Date;
  let campaignId: string;
  let inviteId: string;
  let messageId: string;

  beforeEach(async () => {
    store = new MemoryUgcStore();
    now = new Date("2026-10-26T10:00:00.000Z");
    store.now = () => now;
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
    await postUgcRoomMessage(CREATOR, inviteId, "Rude words here");
    messageId = store.roomMessages[0].id;
  });

  it("lets the other party report a message, once", async () => {
    expect(await reportRoomMessage(MEMBER, messageId, "abuse")).toEqual({
      reported: true,
    });
    await expect(
      reportRoomMessage(MEMBER, messageId, "spam"),
    ).rejects.toMatchObject({ status: 409, code: "ALREADY_REPORTED" });
    expect(store.roomReports).toHaveLength(1);
  });

  it("refuses own messages, strangers, guests and unknown reasons", async () => {
    await expect(
      reportRoomMessage(CREATOR, messageId, "spam"),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      reportRoomMessage(STRANGER, messageId, "spam"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      reportRoomMessage(null, messageId, "spam"),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      reportRoomMessage(MEMBER, messageId, "because" as never),
    ).rejects.toMatchObject({ status: 400 });
    expect(store.roomReports).toHaveLength(0);
  });

  it("shows open reports to moderators only, and hides the message on a decision", async () => {
    await reportRoomMessage(MEMBER, messageId, "abuse");
    await expect(listRoomReportQueue(false)).rejects.toMatchObject({
      status: 404,
    });
    const queue = await listRoomReportQueue(true);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      body: "Rude words here",
      reason: "abuse",
      hidden: false,
    });
    await expect(
      decideRoomReport({
        adminId: MEMBER,
        isAdmin: false,
        reportId: queue[0].id,
        to: "hidden",
      }),
    ).rejects.toMatchObject({ status: 404 });
    await decideRoomReport({
      adminId: ADMIN,
      isAdmin: true,
      reportId: queue[0].id,
      to: "hidden",
    });
    expect(await listRoomReportQueue(true)).toEqual([]);
    const room = await getUgcRoom(MEMBER, inviteId);
    const line = room.items.find((item) => item.kind === "message");
    expect(line).toMatchObject({ body: null, hidden: true });
    await expect(
      decideRoomReport({
        adminId: ADMIN,
        isAdmin: true,
        reportId: queue[0].id,
        to: "dismissed",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("dismisses a report and leaves the message", async () => {
    await reportRoomMessage(MEMBER, messageId, "other");
    const [row] = await listRoomReportQueue(true);
    await decideRoomReport({
      adminId: ADMIN,
      isAdmin: true,
      reportId: row.id,
      to: "dismissed",
    });
    const room = await getUgcRoom(CREATOR, inviteId);
    expect(room.items.find((item) => item.kind === "message")).toMatchObject({
      hidden: false,
      body: "Rude words here",
    });
  });

  it("removes text of rooms closed more than 12 months ago, keeps the rest", async () => {
    store.roomClosedAt.set(inviteId, new Date("2025-10-01T00:00:00.000Z"));
    expect(await sweepRoomMessages(now)).toEqual({ deleted: 1 });
    expect(store.roomMessages).toHaveLength(0);

    await postUgcRoomMessage(CREATOR, inviteId, "Another");
    store.roomClosedAt.set(inviteId, new Date("2026-06-01T00:00:00.000Z"));
    expect(await sweepRoomMessages(now)).toEqual({ deleted: 0 });
    expect(store.roomMessages).toHaveLength(1);
  });

  it("is zero before migration 0078", async () => {
    store.deleteClosedRoomMessages = async () => {
      throw Object.assign(new Error("no table"), { code: "42P01" });
    };
    expect(await sweepRoomMessages(now)).toEqual({ deleted: 0 });
  });

  it("lists videos past the review time for support, only for admins", async () => {
    await acceptInvite(CREATOR, inviteId);
    await submitVideo(
      CREATOR,
      inviteId,
      "https://www.tiktok.com/@a/video/1",
      "Hook",
    );
    expect(await listEscalatedReviews(true)).toEqual([]);
    now = new Date("2026-11-03T10:00:00.000Z");
    await remindReviews(store);
    const rows = await listEscalatedReviews(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      productName: "North",
      dueAt: "2026-11-02T10:00:00.000Z",
    });
    await expect(listEscalatedReviews(false)).rejects.toMatchObject({
      status: 404,
    });
  });
});
