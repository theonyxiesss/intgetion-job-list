import { randomBytes, randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { HttpError } from "@/lib/http";
import { TRANSFER_TOPIC } from "@/lib/billing/verify-transfer";
import {
  issueWalletNonce,
  verifyWalletSignature,
} from "@/modules/billing/service";
import {
  disconnectAccountWallet,
  issueAccountWalletNonce,
  verifyAccountWalletSignature,
} from "@/modules/users/service";
import {
  acceptInvite,
  campaignDepositState,
  closeCampaign,
  confirmCampaignDeposit,
  createCampaign,
  createCampaignDeposit,
  decideCampaign,
  decideSubmission,
  listRefundsDue,
  listWalletPayouts,
  offerHire,
  payRewardByTx,
  refundByTx,
  saveCreatorProfile,
  setUgcChainReaderForTests,
  submitVideo,
} from "./service";

/**
 * The UGC campaign wallet (D466) on a real database. The network is a fake
 * reader; no live transfer happens in tests.
 */

const memberId = randomUUID();
const creatorId = randomUUID();
const strangerId = randomUUID();
const adminId = randomUUID();
const userIds = [memberId, creatorId, strangerId, adminId];
const companyId = randomUUID();
const token = memberId.slice(0, 8);
const USDC = "0x1111111111111111111111111111111111111111";
const platform = privateKeyToAccount(generatePrivateKey());
const payer = privateKeyToAccount(generatePrivateKey());
const creatorWallet = privateKeyToAccount(generatePrivateKey());
const platformAddress = platform.address.toLowerCase();
const payerAddress = payer.address.toLowerCase();
const creatorAddress = creatorWallet.address.toLowerCase();
const saved = {
  enabled: process.env.BILLING_ENABLED,
  provider: process.env.BILLING_CRYPTO_PROVIDER,
  contracts: process.env.BILLING_TOKEN_CONTRACTS,
  wallet: process.env.COMPANY_WALLET_ADDRESS,
};

function restore(name: keyof NodeJS.ProcessEnv, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function topic(address: string): string {
  return `0x${address.replace(/^0x/, "").padStart(64, "0")}`;
}

/** A receipt of one USDC transfer, as the network would return it. */
function network(input: {
  to: string;
  from: string;
  units: bigint;
  confirmations?: number;
}) {
  return async () => ({
    receipt: {
      status: "0x1",
      logs: [
        {
          address: USDC,
          topics: [TRANSFER_TOPIC, topic(input.from), topic(input.to)],
          data: `0x${input.units.toString(16).padStart(64, "0")}`,
        },
      ],
    },
    blockTimestamp: Math.floor(Date.now() / 1000) + 5,
    confirmations: input.confirmations ?? 50,
  });
}

const hash = () => `0x${randomBytes(32).toString("hex")}`;
const tx = (txHash: string) => ({ chain: "base", token: "USDC", txHash });

async function expectCode(promise: Promise<unknown>, code: string | number) {
  try {
    await promise;
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    const http = error as HttpError;
    expect(typeof code === "number" ? http.status : http.code).toBe(code);
  }
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

beforeAll(async () => {
  process.env.BILLING_ENABLED = "true";
  process.env.BILLING_CRYPTO_PROVIDER = "walletconnect";
  process.env.BILLING_TOKEN_CONTRACTS = JSON.stringify({ base: { USDC } });
  process.env.COMPANY_WALLET_ADDRESS = platform.address;
  const db = getDb();
  for (const id of userIds) {
    await db.insert(users).values({
      id,
      authUid: randomUUID(),
      termsAcceptedAt: new Date(),
      termsVersion: "2026-10-03",
      locale: "en",
      platformRole: id === adminId ? "admin" : "user",
    });
  }
  await db.execute(sql`
    insert into public.companies (id, name, slug, status)
    values (${companyId}, ${`Wallet ${token}`}, ${`ugc-wallet-${token}`}, 'verified')
  `);
  await db.execute(sql`
    insert into public.company_members (company_id, user_id, role)
    values (${companyId}, ${memberId}, 'owner')
  `);
});

afterAll(async () => {
  setUgcChainReaderForTests(undefined);
  restore("BILLING_ENABLED", saved.enabled);
  restore("BILLING_CRYPTO_PROVIDER", saved.provider);
  restore("BILLING_TOKEN_CONTRACTS", saved.contracts);
  restore("COMPANY_WALLET_ADDRESS", saved.wallet);
  const db = getDb();
  await db.execute(sql`
    delete from public.ugc_refunds where campaign_id in (
      select id from public.ugc_campaigns where company_id = ${companyId})
  `);
  await db.execute(
    sql`delete from public.ugc_campaigns where company_id = ${companyId}`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("UGC campaign wallet (D466)", () => {
  it("takes the budget, pays a reward by its transaction and returns the rest", async () => {
    const created = await createCampaign(memberId, {
      companyId,
      productName: `Wallet test ${token}`,
      productSummary: "A small app for trying the campaign wallet",
      goal: "awareness",
      niches: ["app"],
      audience: "People who try new apps",
      country: null,
      languages: ["en"],
      mustSay: "Say the name",
      mustNot: "Do not promise income",
      platforms: ["tiktok"],
      videosWanted: 2,
      bountyMinor: BigInt(1500),
      deadline: inDays(30),
      rights: "organic",
      pitch: "We would like a short video",
      exampleUrls: [],
    });
    await decideCampaign({
      adminId,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    await saveCreatorProfile(creatorId, {
      displayName: "Ada",
      languages: ["en"],
      platforms: ["tiktok"],
      niches: ["app"],
      country: null,
      exampleUrls: [],
      inviteOptIn: true,
      status: "active",
    });

    // No offer before the budget is in.
    await expectCode(
      offerHire(memberId, created.id, creatorId),
      "UGC_DEPOSIT_REQUIRED",
    );
    const state = await campaignDepositState(memberId, created.id);
    expect(state).toMatchObject({
      required: true,
      payable: true,
      paid: false,
      budgetMinor: "3000",
    });
    await expectCode(campaignDepositState(strangerId, created.id), 404);
    await expectCode(
      createCampaignDeposit(strangerId, created.id, { token: "USDC" }),
      404,
    );
    await expectCode(
      createCampaignDeposit(memberId, created.id, { token: "USDC" }),
      "WALLET_REQUIRED",
    );
    const signIn = await issueWalletNonce(memberId, payer.address, 8453);
    await verifyWalletSignature(
      memberId,
      await payer.signMessage({ message: signIn.message }),
    );
    const deposit = await createCampaignDeposit(memberId, created.id, {
      token: "USDC",
    });
    expect(deposit).toMatchObject({
      status: "awaiting_payment",
      recipient: platformAddress,
      tokenContract: USDC,
      tokenAmount: "30",
      amountMinor: "3000",
    });

    // A transfer elsewhere is not counted; the right one is.
    setUgcChainReaderForTests(
      network({
        to: creatorAddress,
        from: payerAddress,
        units: BigInt(30_000_000),
      }),
    );
    expect(
      (await confirmCampaignDeposit(memberId, deposit.id, hash())).status,
    ).toBe("failed");
    const retry = await createCampaignDeposit(memberId, created.id, {
      token: "USDC",
    });
    const depositHash = hash();
    setUgcChainReaderForTests(
      network({
        to: platformAddress,
        from: payerAddress,
        units: BigInt(30_000_000),
      }),
    );
    await expectCode(
      confirmCampaignDeposit(strangerId, retry.id, depositHash),
      404,
    );
    expect(
      (await confirmCampaignDeposit(memberId, retry.id, depositHash)).status,
    ).toBe("paid");
    expect(await campaignDepositState(memberId, created.id)).toMatchObject({
      paid: true,
      payable: false,
    });

    // Hire within the budget, accept one video.
    const offer = await offerHire(memberId, created.id, creatorId);
    await acceptInvite(creatorId, offer.inviteId);
    await submitVideo(
      creatorId,
      offer.inviteId,
      "https://www.tiktok.com/v/1",
      "",
    );
    await decideSubmission(memberId, offer.inviteId, "accepted");
    const owed = (await listWalletPayouts(true)).find(
      (row) => row.productName === `Wallet test ${token}`,
    );
    expect(owed).toMatchObject({
      amountMinor: "1500",
      fromWallet: true,
      payoutAddress: null,
    });
    await expectCode(listWalletPayouts(false), 404);
    await expectCode(
      payRewardByTx({
        adminId,
        isAdmin: true,
        payoutId: owed!.id,
        tx: tx(hash()),
      }),
      "PAYOUT_WALLET_REQUIRED",
    );

    // The creator links the account wallet (D518). A first wallet may be
    // linked while a reward is owed; changing it may not, so the owed reward
    // is never sent somewhere else.
    const { message } = await issueAccountWalletNonce(creatorId, {
      address: creatorWallet.address,
      chainId: 8453,
    });
    await verifyAccountWalletSignature(creatorId, {
      signature: await creatorWallet.signMessage({ message }),
    });
    await expectCode(
      issueAccountWalletNonce(creatorId, {
        address: privateKeyToAccount(generatePrivateKey()).address,
        chainId: 8453,
      }),
      "WALLET_PAYOUTS_PENDING",
    );
    await expectCode(
      disconnectAccountWallet(creatorId),
      "WALLET_PAYOUTS_PENDING",
    );

    // Only an admin, only the right sender, recipient and amount, confirmed.
    await expectCode(
      payRewardByTx({
        adminId: memberId,
        isAdmin: false,
        payoutId: owed!.id,
        tx: tx(hash()),
      }),
      404,
    );
    setUgcChainReaderForTests(
      network({
        to: creatorAddress,
        from: payerAddress,
        units: BigInt(15_000_000),
      }),
    );
    await expectCode(
      payRewardByTx({
        adminId,
        isAdmin: true,
        payoutId: owed!.id,
        tx: tx(hash()),
      }),
      "UGC_TX_INVALID",
    );
    setUgcChainReaderForTests(
      network({
        to: creatorAddress,
        from: platformAddress,
        units: BigInt(10_000_000),
      }),
    );
    await expectCode(
      payRewardByTx({
        adminId,
        isAdmin: true,
        payoutId: owed!.id,
        tx: tx(hash()),
      }),
      "UGC_TX_INVALID",
    );
    setUgcChainReaderForTests(
      network({
        to: creatorAddress,
        from: platformAddress,
        units: BigInt(15_000_000),
        confirmations: 1,
      }),
    );
    await expectCode(
      payRewardByTx({
        adminId,
        isAdmin: true,
        payoutId: owed!.id,
        tx: tx(hash()),
      }),
      "UGC_TX_PENDING",
    );
    await expectCode(
      payRewardByTx({
        adminId,
        isAdmin: true,
        payoutId: owed!.id,
        tx: tx(depositHash),
      }),
      "HASH_USED",
    );
    setUgcChainReaderForTests(
      network({
        to: creatorAddress,
        from: platformAddress,
        units: BigInt(15_000_000),
      }),
    );
    const rewardHash = hash();
    expect(
      await payRewardByTx({
        adminId,
        isAdmin: true,
        payoutId: owed!.id,
        tx: tx(rewardHash),
      }),
    ).toMatchObject({ status: "paid", txHash: rewardHash });
    await expectCode(
      payRewardByTx({
        adminId,
        isAdmin: true,
        payoutId: owed!.id,
        tx: tx(hash()),
      }),
      409,
    );

    // The rest goes back only after closing, to the address it came from.
    await expectCode(
      refundByTx({
        adminId,
        isAdmin: true,
        campaignId: created.id,
        tx: tx(hash()),
      }),
      "UGC_REFUND_WAIT",
    );
    await closeCampaign(memberId, created.id);
    const due = (await listRefundsDue(true)).find(
      (row) => row.campaignId === created.id,
    );
    expect(due).toMatchObject({
      amountMinor: "1500",
      recipient: payerAddress,
      waiting: false,
    });
    await expectCode(
      refundByTx({
        adminId,
        isAdmin: true,
        campaignId: created.id,
        tx: tx(rewardHash),
      }),
      "HASH_USED",
    );
    setUgcChainReaderForTests(
      network({
        to: payerAddress,
        from: platformAddress,
        units: BigInt(10_000_000),
      }),
    );
    await expectCode(
      refundByTx({
        adminId,
        isAdmin: true,
        campaignId: created.id,
        tx: tx(hash()),
      }),
      "UGC_TX_INVALID",
    );
    setUgcChainReaderForTests(
      network({
        to: payerAddress,
        from: platformAddress,
        units: BigInt(15_000_000),
      }),
    );
    expect(
      await refundByTx({
        adminId,
        isAdmin: true,
        campaignId: created.id,
        tx: tx(hash()),
      }),
    ).toMatchObject({ amountMinor: "1500" });
    await expectCode(
      refundByTx({
        adminId,
        isAdmin: true,
        campaignId: created.id,
        tx: tx(hash()),
      }),
      409,
    );
    expect(
      (await listRefundsDue(true)).some((row) => row.campaignId === created.id),
    ).toBe(false);
  });
});
