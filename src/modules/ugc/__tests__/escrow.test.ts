import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import { ugcTools } from "../service/bot-tools";
import {
  acceptInvite,
  createCampaign,
  decideCampaign,
  decideSubmission,
  listOwedPayouts,
  markPayoutPaid,
  offerHire,
  saveCreatorProfile,
  submitVideo,
  useUgcStore,
} from "../service/commands";
import {
  assertBudgetRoom,
  committedMinor,
  escrowRequired,
  refundableMinor,
  refundBlocked,
} from "../service/escrow-rules";
import { escrowOn } from "../service/escrow-gate";
import { MemoryUgcStore } from "../service/memory";
import { campaignProgress, emptyCounts } from "../service/progress";
import type { BriefInput, ProfileInput } from "../service/records";

/**
 * Campaign wallet (D466): no offer before the budget is paid in, no offer
 * past it, a reward of a paid brief needs its transaction, the rest goes
 * back only from a closed brief with nothing left to decide.
 */

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const ADA = "00000000-0000-4000-8000-000000000003";
const BEA = "00000000-0000-4000-8000-000000000005";
const ADMIN = "00000000-0000-4000-8000-000000000004";
const WALLET = "0x2222222222222222222222222222222222222222";

const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];
const saved = {
  enabled: process.env.BILLING_ENABLED,
  provider: process.env.BILLING_CRYPTO_PROVIDER,
  wallet: process.env.COMPANY_WALLET_ADDRESS,
};

function restore(name: keyof NodeJS.ProcessEnv, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

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
    deadline: "2026-10-20",
    rights: "organic",
    pitch: "We would like a short video",
    exampleUrls: [],
    ...over,
  };
}

function profile(name: string): ProfileInput {
  return {
    displayName: name,
    languages: ["en"],
    platforms,
    niches,
    country: null,
    exampleUrls: [],
    inviteOptIn: true,
    status: "active",
  };
}

describe("UGC campaign wallet rules (D466)", () => {
  it("counts offered and hired rewards plus the next one", () => {
    const invites = [
      { status: "offered", bountyMinor: BigInt(1500) },
      { status: "hired", bountyMinor: BigInt(1500) },
      { status: "declined", bountyMinor: BigInt(1500) },
      { status: "applied", bountyMinor: null },
    ];
    expect(committedMinor(invites, BigInt(2000))).toBe(BigInt(5000));
  });

  it("refuses an offer without a budget and one past it", () => {
    expect(() =>
      assertBudgetRoom({ depositMinor: null, committedMinor: BigInt(1) }),
    ).toThrow(expect.objectContaining({ code: "UGC_DEPOSIT_REQUIRED" }));
    expect(() =>
      assertBudgetRoom({
        depositMinor: BigInt(3000),
        committedMinor: BigInt(3001),
      }),
    ).toThrow(expect.objectContaining({ code: "UGC_BUDGET_EXCEEDED" }));
    expect(() =>
      assertBudgetRoom({
        depositMinor: BigInt(3000),
        committedMinor: BigInt(3000),
      }),
    ).not.toThrow();
  });

  it("returns the budget minus every recorded reward, never below zero", () => {
    expect(refundableMinor(BigInt(3000), [BigInt(1500)])).toBe(BigInt(1500));
    expect(refundableMinor(BigInt(3000), [BigInt(1500), BigInt(1500)])).toBe(
      BigInt(0),
    );
    expect(refundableMinor(BigInt(1000), [BigInt(1500)])).toBe(BigInt(0));
  });

  it("holds the rest until the brief is closed and no video waits", () => {
    expect(refundBlocked("open", [])).toBe(true);
    expect(refundBlocked("closed", ["submitted"])).toBe(true);
    expect(refundBlocked("closed", ["changes_requested", "accepted"])).toBe(
      false,
    );
    expect(refundBlocked("closed", [])).toBe(false);
  });

  it("needs the checkout to be on", () => {
    expect(escrowRequired(false)).toBe(false);
    expect(escrowRequired(true)).toBe(true);
  });

  it("puts the deposit step before hiring on the track", () => {
    const counts = { ...emptyCounts(), applied: 2 };
    expect(campaignProgress("open", counts, { depositNeeded: true })).toEqual({
      step: "hire",
      next: "deposit",
      counts,
    });
    expect(campaignProgress("open", counts).next).toBe("hire");
    expect(
      campaignProgress("open", emptyCounts(), { depositNeeded: true }).next,
    ).toBe("deposit");
  });
});

describe("UGC offers with the campaign wallet on (D466)", () => {
  let store: MemoryUgcStore;

  beforeEach(() => {
    process.env.BILLING_ENABLED = "true";
    process.env.BILLING_CRYPTO_PROVIDER = "walletconnect";
    process.env.COMPANY_WALLET_ADDRESS = WALLET;
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
  });

  afterEach(() => {
    restore("BILLING_ENABLED", saved.enabled);
    restore("BILLING_CRYPTO_PROVIDER", saved.provider);
    restore("COMPANY_WALLET_ADDRESS", saved.wallet);
    useUgcStore(null);
  });

  async function openBrief() {
    const created = await createCampaign(MEMBER, brief());
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    await saveCreatorProfile(ADA, profile("Ada"));
    await saveCreatorProfile(BEA, profile("Bea"));
    return created.id;
  }

  it("is on only with the checkout and its wallet", () => {
    expect(escrowOn()).toBe(true);
    delete process.env.COMPANY_WALLET_ADDRESS;
    expect(escrowOn()).toBe(false);
  });

  it("refuses an offer before the budget is paid in", async () => {
    const id = await openBrief();
    await expect(offerHire(MEMBER, id, ADA)).rejects.toMatchObject({
      status: 409,
      code: "UGC_DEPOSIT_REQUIRED",
    });
  });

  it("offers within the paid budget and refuses past it", async () => {
    const id = await openBrief();
    store.deposits.set(id, BigInt(1500));
    await expect(offerHire(MEMBER, id, ADA)).resolves.toMatchObject({
      inviteId: expect.any(String),
    });
    await expect(offerHire(MEMBER, id, BEA)).rejects.toMatchObject({
      status: 409,
      code: "UGC_BUDGET_EXCEEDED",
    });
    store.deposits.set(id, BigInt(3000));
    await expect(offerHire(MEMBER, id, BEA)).resolves.toMatchObject({
      inviteId: expect.any(String),
    });
  });

  it("needs a transaction for a reward of a paid brief", async () => {
    const id = await openBrief();
    store.deposits.set(id, BigInt(3000));
    const offer = await offerHire(MEMBER, id, ADA);
    await acceptInvite(ADA, offer.inviteId);
    await submitVideo(ADA, offer.inviteId, "https://www.tiktok.com/v/1", "");
    await decideSubmission(MEMBER, offer.inviteId, "accepted");
    const [owed] = await listOwedPayouts(true);
    await expect(
      markPayoutPaid({ adminId: ADMIN, isAdmin: true, payoutId: owed!.id }),
    ).rejects.toMatchObject({ status: 409, code: "UGC_TX_REQUIRED" });
  });

  it("tells Spoki whether the budget is paid in", async () => {
    const id = await openBrief();
    const found = ugcTools.find((row) => row.name === "get_ugc_campaign")!;
    const run = found.run as unknown as (
      ctx: { userId: string; locale: string },
      input: { campaignId: string },
    ) => Promise<{ llm: unknown }>;
    const ctx = { userId: MEMBER, locale: "en" };
    const before = await run(ctx, { campaignId: id });
    expect(String(before.llm)).toContain('"budgetRequired":true');
    expect(String(before.llm)).toContain('"budgetPaidIn":false');
    store.deposits.set(id, BigInt(3000));
    const after = await run(ctx, { campaignId: id });
    expect(String(after.llm)).toContain('"budgetPaidIn":true');
    expect(String(after.llm)).toContain('"budget":"$30"');
  });
});
