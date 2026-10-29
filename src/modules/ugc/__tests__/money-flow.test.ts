import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const escrow = vi.hoisted(() => ({
  deposit: null as null | {
    status: string;
    created_at: string;
    amount_minor: string;
  },
  refund: null as null | { created_at: string; amount_minor: string },
}));
vi.mock("../repo/escrow-repo", () => ({
  latestDeposit: vi.fn(async () => escrow.deposit),
  latestDeposits: vi.fn(async () => new Map()),
  findRefund: vi.fn(async () => escrow.refund),
}));

import {
  acceptInvite,
  applyToCampaign,
  createCampaign,
  decideCampaign,
  decideDispute,
  decideSubmission,
  listDisputeQueue,
  markPayoutPaid,
  offerHire,
  openDispute,
  saveCreatorProfile,
  submitVideo,
  useUgcStore,
} from "../service/commands";
import { orderMoneyHistory } from "../service/escrow";
import { MemoryUgcStore } from "../service/memory";
import { buildMoneyHistory } from "../service/money-history";
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

describe("money history (pure)", () => {
  const payout = {
    amountMinor: "1500",
    createdAt: new Date("2026-10-27T10:00:00.000Z"),
    paidAt: new Date("2026-10-29T10:00:00.000Z"),
  };
  const deposit = { at: "2026-10-26T10:00:00.000Z", amountMinor: "3000" };
  const refund = { at: "2026-10-30T10:00:00.000Z", amountMinor: "1500" };

  it("gives the company the budget, the reward and the return in time order", () => {
    const events = buildMoneyHistory({
      side: "company",
      deposit,
      refund,
      payout,
    });
    expect(events.map((row) => row.kind)).toEqual([
      "deposit",
      "accrued",
      "paid",
      "refund",
    ]);
  });

  it("gives the creator only what was earned and paid", () => {
    const events = buildMoneyHistory({
      side: "creator",
      deposit,
      refund,
      payout,
    });
    expect(events.map((row) => row.kind)).toEqual(["accrued", "paid"]);
  });

  it("shows an owed reward without a payment, and nothing without a payout", () => {
    expect(
      buildMoneyHistory({
        side: "creator",
        payout: { ...payout, paidAt: null },
      }).map((row) => row.kind),
    ).toEqual(["accrued"]);
    expect(buildMoneyHistory({ side: "creator" })).toEqual([]);
  });
});

describe("money of an order and the payout hold (U7)", () => {
  let store: MemoryUgcStore;
  let campaignId: string;
  let inviteId: string;

  beforeEach(async () => {
    escrow.deposit = null;
    escrow.refund = null;
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
    await applyToCampaign(CREATOR, campaignId);
    inviteId = (await offerHire(MEMBER, campaignId, CREATOR)).inviteId;
    await acceptInvite(CREATOR, inviteId);
    await submitVideo(
      CREATOR,
      inviteId,
      "https://www.tiktok.com/@a/video/1",
      "Hook",
    );
    await decideSubmission(MEMBER, inviteId, "accepted");
  });

  it("shows both sides the accrued reward, and the budget to the company only", async () => {
    escrow.deposit = {
      status: "confirmed",
      created_at: "2020-01-01T00:00:00.000Z",
      amount_minor: "3000",
    };
    const creator = await orderMoneyHistory(CREATOR, inviteId);
    expect(creator.map((row) => row.kind)).toEqual(["accrued"]);
    expect(creator[0].amountMinor).toBe("1500");
    const company = await orderMoneyHistory(MEMBER, inviteId);
    expect(company.map((row) => row.kind)).toEqual(["deposit", "accrued"]);
  });

  it("shows the payment after the reward was marked paid", async () => {
    const payout = [...store.payouts.values()][0];
    await markPayoutPaid({
      adminId: ADMIN,
      isAdmin: true,
      payoutId: payout.id,
    });
    const creator = await orderMoneyHistory(CREATOR, inviteId);
    expect(creator.map((row) => row.kind)).toEqual(["accrued", "paid"]);
  });

  it("shows the money to the two parties only", async () => {
    await expect(orderMoneyHistory(STRANGER, inviteId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(orderMoneyHistory(null, inviteId)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("holds the payout while a problem is open and releases it when closed", async () => {
    const payout = [...store.payouts.values()][0];
    await openDispute(CREATOR, inviteId, "payment");
    await expect(
      markPayoutPaid({ adminId: ADMIN, isAdmin: true, payoutId: payout.id }),
    ).rejects.toMatchObject({ status: 409, code: "UGC_DISPUTE_OPEN_PAYOUT" });
    expect(store.payouts.get(payout.id)?.status).toBe("owed");

    const [row] = await listDisputeQueue(true);
    await decideDispute({
      adminId: ADMIN,
      isAdmin: true,
      disputeId: row.id,
      to: "resolved",
      outcome: "agreed",
    });
    await markPayoutPaid({
      adminId: ADMIN,
      isAdmin: true,
      payoutId: payout.id,
    });
    expect(store.payouts.get(payout.id)?.status).toBe("paid");
  });

  it("does not hold the payout before migration 0083", async () => {
    const payout = [...store.payouts.values()][0];
    store.listDisputes = async () => {
      throw Object.assign(new Error("no table"), { code: "42P01" });
    };
    await markPayoutPaid({
      adminId: ADMIN,
      isAdmin: true,
      payoutId: payout.id,
    });
    expect(store.payouts.get(payout.id)?.status).toBe("paid");
  });
});
