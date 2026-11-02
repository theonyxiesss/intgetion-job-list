import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const ledger = vi.hoisted(() => ({
  rows: [] as {
    campaign_id: string;
    product_name: string;
    status: string;
    deposit_minor: string;
    accrued_minor: string;
    paid_minor: string;
    refund_minor: string;
  }[],
}));
vi.mock("../repo/escrow-repo", () => ({
  campaignLedger: vi.fn(async () => ledger.rows),
  latestDeposits: vi.fn(async () => new Map()),
}));

import {
  acceptInvite,
  applyToCampaign,
  createCampaign,
  decideCampaign,
  decideDispute,
  getUgcRoom,
  listDisputeQueue,
  noteDeadlines,
  offerHire,
  openDispute,
  saveCreatorProfile,
  useUgcStore,
} from "../service/commands";
import { disputeDueAt, disputeOverdue } from "../service/dispute-clock";
import { listMoneyLedger } from "../service/escrow";
import { reconcileLedger } from "../service/ledger";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
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

/** Friday 2026-10-30, 10:00 UTC. */
const FRIDAY = new Date("2026-10-30T10:00:00.000Z");

describe("support response time (D590)", () => {
  it("is three business days, skipping the weekend", () => {
    expect(disputeDueAt(FRIDAY).toISOString()).toBe("2026-11-04T10:00:00.000Z");
  });

  it("is late only while nobody from support has answered", () => {
    const after = new Date("2026-11-04T10:00:00.000Z");
    const before = new Date("2026-11-04T09:59:59.000Z");
    expect(disputeOverdue(after, { status: "open", createdAt: FRIDAY })).toBe(
      true,
    );
    expect(disputeOverdue(before, { status: "open", createdAt: FRIDAY })).toBe(
      false,
    );
    expect(
      disputeOverdue(after, { status: "in_review", createdAt: FRIDAY }),
    ).toBe(false);
  });

  describe("on an order", () => {
    let store: MemoryUgcStore;
    let inviteId: string;

    beforeEach(async () => {
      store = new MemoryUgcStore();
      store.clock = FRIDAY;
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
      await applyToCampaign(CREATOR, created.id);
      inviteId = (await offerHire(MEMBER, created.id, CREATOR)).inviteId;
      await acceptInvite(CREATOR, inviteId);
      await openDispute(CREATOR, inviteId, "payment", "Not paid yet");
    });

    it("shows both parties when support answers, until it does", async () => {
      const room = await getUgcRoom(MEMBER, inviteId);
      expect(room.dispute?.dueAt).toBe("2026-11-04T10:00:00.000Z");
      await decideDispute({
        adminId: ADMIN,
        isAdmin: true,
        disputeId: store.disputes[0]!.id,
        to: "in_review",
      });
      expect((await getUgcRoom(CREATOR, inviteId)).dispute?.dueAt).toBeNull();
    });

    it("puts late problems first in the support queue", async () => {
      expect((await listDisputeQueue(true))[0]).toMatchObject({
        overdue: false,
        dueAt: "2026-11-04T10:00:00.000Z",
      });
      store.clock = new Date("2026-11-05T08:00:00.000Z");
      expect((await listDisputeQueue(true))[0]).toMatchObject({
        overdue: true,
      });
    });

    it("sends support one note a day only while a problem is late", async () => {
      expect((await noteDeadlines()).support).toEqual({ overdue: 0 });
      expect(store.supportNotes).toHaveLength(0);
      store.clock = new Date("2026-11-05T08:20:00.000Z");
      expect((await noteDeadlines()).support).toEqual({ overdue: 1 });
      expect(store.supportNotes).toHaveLength(1);
      expect(store.supportNotes[0]!.text).toContain(store.disputes[0]!.id);
      await decideDispute({
        adminId: ADMIN,
        isAdmin: true,
        disputeId: store.disputes[0]!.id,
        to: "in_review",
      });
      expect((await noteDeadlines()).support).toEqual({ overdue: 0 });
      expect(store.supportNotes).toHaveLength(1);
    });
  });
});

describe("money reconciliation (U7)", () => {
  const base = {
    depositMinor: BigInt(5000),
    accruedMinor: BigInt(3000),
    paidMinor: BigInt(3000),
    refundMinor: BigInt(0),
  };

  it("keeps paid in = recorded + returned + rest", () => {
    expect(reconcileLedger({ ...base, status: "open" })).toEqual({
      restMinor: BigInt(2000),
      owedMinor: BigInt(0),
      state: "running",
    });
    expect(
      reconcileLedger({ ...base, status: "closed", refundMinor: BigInt(2000) }),
    ).toMatchObject({ restMinor: BigInt(0), state: "settled" });
    expect(reconcileLedger({ ...base, status: "closed" }).state).toBe(
      "refund_due",
    );
    expect(
      reconcileLedger({ ...base, status: "closed", paidMinor: BigInt(1500) }),
    ).toMatchObject({ owedMinor: BigInt(1500), state: "owed" });
  });

  it("flags a brief that records or returns more than was paid in", () => {
    expect(
      reconcileLedger({ ...base, status: "open", refundMinor: BigInt(2500) }),
    ).toMatchObject({ restMinor: BigInt(-500), state: "over" });
  });

  it("is for support only, mismatches first, with totals", async () => {
    await expect(listMoneyLedger(false)).rejects.toMatchObject({
      status: 404,
    });
    ledger.rows = [
      {
        campaign_id: "a",
        product_name: "Settled",
        status: "closed",
        deposit_minor: "5000",
        accrued_minor: "3000",
        paid_minor: "3000",
        refund_minor: "2000",
      },
      {
        campaign_id: "b",
        product_name: "Over",
        status: "open",
        deposit_minor: "1000",
        accrued_minor: "1500",
        paid_minor: "0",
        refund_minor: "0",
      },
    ];
    const result = await listMoneyLedger(true);
    expect(result.rows.map((row) => row.state)).toEqual(["over", "settled"]);
    expect(result.totals).toEqual({
      depositMinor: "6000",
      accruedMinor: "4500",
      paidMinor: "3000",
      refundMinor: "2000",
      restMinor: "-500",
      owedMinor: "1500",
    });
  });
});
