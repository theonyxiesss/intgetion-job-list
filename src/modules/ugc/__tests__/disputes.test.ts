import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

import {
  acceptInvite,
  applyToCampaign,
  createCampaign,
  decideCampaign,
  decideDispute,
  getUgcRoom,
  listDisputeQueue,
  offerHire,
  openDispute,
  postUgcRoomMessage,
  readDisputeRoom,
  saveCreatorProfile,
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

describe("disputes on an order (U7)", () => {
  let store: MemoryUgcStore;
  let notices: UgcNotice[];
  let audits: string[];
  let campaignId: string;
  let inviteId: string;

  beforeEach(async () => {
    store = new MemoryUgcStore();
    notices = [];
    audits = [];
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
  });

  it("is possible only on an order the creator agreed to", async () => {
    await expect(
      openDispute(CREATOR, inviteId, "quality"),
    ).rejects.toMatchObject({ status: 409 });
    expect((await getUgcRoom(CREATOR, inviteId)).canOpenDispute).toBe(false);
    await acceptInvite(CREATOR, inviteId);
    expect((await getUgcRoom(CREATOR, inviteId)).canOpenDispute).toBe(true);
  });

  describe("after hire", () => {
    beforeEach(async () => {
      await acceptInvite(CREATOR, inviteId);
      notices.length = 0;
    });

    it("lets support read the room of a dispute only as an admin, and audits it", async () => {
      await postUgcRoomMessage(MEMBER, inviteId, "Hello there");
      await openDispute(CREATOR, inviteId, "payment", "Not paid yet");
      const disputeId = store.disputes[0]!.id;
      await expect(
        readDisputeRoom({ adminId: MEMBER, isAdmin: false, disputeId }),
      ).rejects.toMatchObject({ status: 404 });
      const read = await readDisputeRoom({
        adminId: ADMIN,
        isAdmin: true,
        disputeId,
      });
      expect(read.dispute).toMatchObject({
        reason: "payment",
        side: "creator",
      });
      expect(read.messages.map((row) => row.body)).toEqual(["Hello there"]);
      expect(audits).toContain("ugc.dispute_room_read");
    });

    it("lets either side raise one, tells the other side, and shows both the same", async () => {
      await openDispute(CREATOR, inviteId, "payment", "Not paid yet");
      const note = notices.find((row) => row.type === "ugc.dispute")!;
      expect(note.userIds).toEqual([MEMBER]);
      expect(note.payload.stage).toBe("opened");
      const company = await getUgcRoom(MEMBER, inviteId);
      const creator = await getUgcRoom(CREATOR, inviteId);
      expect(company.dispute).toEqual(creator.dispute);
      expect(company.dispute).toMatchObject({
        status: "open",
        reason: "payment",
        side: "creator",
      });
      expect(company.canOpenDispute).toBe(false);
      expect(
        company.items.some(
          (item) => item.kind === "event" && item.event === "dispute_opened",
        ),
      ).toBe(true);
      expect(audits).toContain("ugc.dispute_opened");
    });

    it("lets the company raise one too, and the creator hears of it", async () => {
      await openDispute(MEMBER, inviteId, "no_response");
      const note = notices.find((row) => row.type === "ugc.dispute")!;
      expect(note.userIds).toEqual([CREATOR]);
    });

    it("allows one unresolved dispute at a time", async () => {
      await openDispute(CREATOR, inviteId, "quality");
      await expect(
        openDispute(MEMBER, inviteId, "quality"),
      ).rejects.toMatchObject({ status: 409, code: "UGC_DISPUTE_OPEN" });
      expect(store.disputes).toHaveLength(1);
    });

    it("refuses an unknown reason, contacts in the note, a long note and strangers", async () => {
      await expect(
        openDispute(CREATOR, inviteId, "because" as never),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        openDispute(CREATOR, inviteId, "other", "write me@example.com"),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        openDispute(CREATOR, inviteId, "other", "x".repeat(501)),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        openDispute(STRANGER, inviteId, "other"),
      ).rejects.toMatchObject({ status: 404 });
      await expect(openDispute(null, inviteId, "other")).rejects.toMatchObject({
        status: 401,
      });
      expect(store.disputes).toHaveLength(0);
    });

    it("shows support the open ones and lets it take one into review", async () => {
      await openDispute(CREATOR, inviteId, "link", "Does not open");
      await expect(listDisputeQueue(false)).rejects.toMatchObject({
        status: 404,
      });
      const [row] = await listDisputeQueue(true);
      expect(row).toMatchObject({
        status: "open",
        note: "Does not open",
        productName: "North",
      });
      await decideDispute({
        adminId: ADMIN,
        isAdmin: true,
        disputeId: row.id,
        to: "in_review",
      });
      expect((await getUgcRoom(CREATOR, inviteId)).dispute?.status).toBe(
        "in_review",
      );
      await expect(
        decideDispute({
          adminId: ADMIN,
          isAdmin: true,
          disputeId: row.id,
          to: "in_review",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("closes with an outcome, tells both sides, and never accepts or pays by itself", async () => {
      await openDispute(CREATOR, inviteId, "quality");
      const [row] = await listDisputeQueue(true);
      await expect(
        decideDispute({
          adminId: ADMIN,
          isAdmin: true,
          disputeId: row.id,
          to: "resolved",
        }),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        decideDispute({
          adminId: MEMBER,
          isAdmin: false,
          disputeId: row.id,
          to: "resolved",
          outcome: "creator",
        }),
      ).rejects.toMatchObject({ status: 404 });
      notices.length = 0;
      expect(
        await decideDispute({
          adminId: ADMIN,
          isAdmin: true,
          disputeId: row.id,
          to: "resolved",
          outcome: "agreed",
        }),
      ).toEqual({ status: "resolved", outcome: "agreed" });
      const note = notices.find((item) => item.type === "ugc.dispute")!;
      expect(note.userIds.sort()).toEqual([CREATOR, MEMBER].sort());
      expect(note.payload.stage).toBe("resolved");
      expect(audits).toContain("ugc.dispute_resolved");
      expect(await listDisputeQueue(true)).toEqual([]);
      expect(store.payouts.size).toBe(0);
      expect((await store.getInvite(inviteId))?.status).toBe("hired");
      await expect(
        decideDispute({
          adminId: ADMIN,
          isAdmin: true,
          disputeId: row.id,
          to: "resolved",
          outcome: "company",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("allows a new dispute after the first one was closed", async () => {
      await openDispute(CREATOR, inviteId, "quality");
      const [row] = await listDisputeQueue(true);
      await decideDispute({
        adminId: ADMIN,
        isAdmin: true,
        disputeId: row.id,
        to: "resolved",
        outcome: "dismissed",
      });
      expect((await getUgcRoom(MEMBER, inviteId)).canOpenDispute).toBe(true);
      await openDispute(MEMBER, inviteId, "payment");
      expect(store.disputes).toHaveLength(2);
    });

    it("works before migration 0083: the room opens, raising answers 503", async () => {
      const missing = Object.assign(new Error("no table"), { code: "42P01" });
      store.listDisputes = async () => {
        throw missing;
      };
      store.insertDispute = async () => {
        throw missing;
      };
      store.listUnresolvedDisputes = async () => {
        throw missing;
      };
      const room = await getUgcRoom(CREATOR, inviteId);
      expect(room.dispute).toBeNull();
      await expect(
        openDispute(CREATOR, inviteId, "quality"),
      ).rejects.toMatchObject({ status: 503, code: "UGC_DISPUTE_NOT_READY" });
      expect(await listDisputeQueue(true)).toEqual([]);
    });
  });
});
