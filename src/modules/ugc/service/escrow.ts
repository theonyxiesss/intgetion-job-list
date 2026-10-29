import { z } from "zod";
import { chainByChainId, chainById, tokenContract } from "@/lib/billing/chains";
import { readChain, type ChainSnapshot } from "@/lib/billing/rpc";
import {
  clientStatus,
  formatTokenAmount,
  settlement,
  type ClientBillingStatus,
} from "@/lib/billing/status";
import {
  tokenUnits,
  verifyTransfer,
  type VerifyResult,
} from "@/lib/billing/verify-transfer";
import {
  errorCodes,
  HttpError,
  notFound,
  unauthenticated,
  validationError,
} from "@/lib/http";
import { logger } from "@/lib/logger";
import { notifyPlatformOwners } from "@/modules/admin-console/service";
import {
  isSanctionedAddress,
  verifiedPayerWallet,
} from "@/modules/billing/service";
import { readAccountWallet } from "@/modules/users/service";
import * as repo from "../repo/escrow-repo";
import {
  assertNoOpenDispute,
  campaignForMember,
  db,
  hasOpenDispute,
  roomParty,
} from "./commands";
import { buildMoneyHistory } from "./money-history";
import { campaignWalletAddress, escrowOn } from "./escrow-gate";
import { refundableMinor, refundBlocked } from "./escrow-rules";
import { ugcBudgetMinor } from "./pricing";
import { UGC_ERRORS } from "./rules";

/**
 * The UGC campaign wallet (D465, D466). The company pays the brief budget to
 * the platform wallet through the checkout; the server reads the receipt.
 * Rewards and the rest go out by hand from that wallet: an admin hands in the
 * transaction and the server checks it before a row is marked. There is no
 * wallet key on the server and nothing is sent automatically.
 */

const DEPOSIT_MS = 30 * 60 * 1000;
const UNIQUE_VIOLATION = "23505";
const HASH = /^0x[0-9a-fA-F]{64}$/;

type ChainReader = (
  chain: string,
  hash: `0x${string}`,
) => Promise<ChainSnapshot>;
let chainReader: ChainReader = readChain;

/** Test seam: a fake network. Undefined puts the real RPC back. */
export function setUgcChainReaderForTests(reader: ChainReader | undefined) {
  chainReader = reader ?? readChain;
}

function walletError(code: string, message: string, status = 409) {
  return new HttpError(status, code, message);
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if ((current as { code?: string }).code === UNIQUE_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function alertOwners(subject: string, lines: string[]) {
  logger.warn({ alert: "ugc_wallet_review" }, subject);
  try {
    await notifyPlatformOwners(subject, lines.join("\n"));
  } catch (error) {
    logger.error({ err: error }, "ugc: owner alert failed");
  }
}

export type DepositView = {
  id: string;
  campaignId: string;
  status: ClientBillingStatus;
  chainId: number;
  token: string;
  tokenContract: string;
  recipient: string;
  tokenAmount: string;
  amountMinor: string;
  expiresAt: string;
};

function view(row: repo.DepositRow, now = new Date()): DepositView {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    status: clientStatus({
      status: row.status,
      reason: row.reason,
      expiresAt: new Date(row.expires_at),
      now,
    }),
    chainId: chainById(row.chain)?.chainId ?? 0,
    token: row.token,
    tokenContract: row.token_contract,
    recipient: row.recipient,
    tokenAmount: formatTokenAmount(row.token_amount),
    amountMinor: row.amount_minor,
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export type DepositState = {
  /** Offers on this brief wait for a paid budget. */
  required: boolean;
  /** Videos × reward, in cents. */
  budgetMinor: string;
  /** A member may start a deposit now. */
  payable: boolean;
  paid: boolean;
  deposit: DepositView | null;
};

/**
 * `campaignDepositState` for briefs the caller already proved to be a
 * member of, in one read instead of one per brief (U2, TZ 48).
 */
export async function depositStatesFor(
  campaigns: readonly {
    id: string;
    status: string;
    videosWanted: number;
    bountyMinor: bigint;
  }[],
): Promise<Map<string, DepositState>> {
  const latest = await repo.latestDeposits(campaigns.map((row) => row.id));
  const required = escrowOn();
  const out = new Map<string, DepositState>();
  for (const campaign of campaigns) {
    const row = latest.get(campaign.id) ?? null;
    const paid = row?.status === "confirmed";
    out.set(campaign.id, {
      required,
      budgetMinor: ugcBudgetMinor(
        campaign.videosWanted,
        Number(campaign.bountyMinor),
      ).toString(),
      payable: required && campaign.status === "open" && !paid,
      paid,
      deposit: row ? view(row) : null,
    });
  }
  return out;
}

/** What the brief page and Spoki say about the budget. Members only. */
export async function campaignDepositState(
  userId: string | null,
  campaignId: string,
): Promise<DepositState> {
  if (!userId) throw unauthenticated();
  const store = await db();
  const campaign = await campaignForMember(store, campaignId, userId);
  const latest = await repo.latestDeposit(campaign.id);
  const paid = latest?.status === "confirmed";
  const required = escrowOn();
  return {
    required,
    budgetMinor: ugcBudgetMinor(
      campaign.videosWanted,
      Number(campaign.bountyMinor),
    ).toString(),
    payable: required && campaign.status === "open" && !paid,
    paid,
    deposit: latest ? view(latest) : null,
  };
}

/**
 * A member opens the deposit of an open brief: videos × reward, to the
 * platform wallet, from the wallet they just signed with at the checkout.
 * A paid brief returns its deposit.
 */
export async function createCampaignDeposit(
  userId: string | null,
  campaignId: string,
  raw: unknown,
  now = new Date(),
): Promise<DepositView> {
  if (!userId) throw unauthenticated();
  const parsed = z
    .object({ token: z.enum(["USDC", "USDT"]) })
    .strict()
    .safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues);
  const store = await db();
  const campaign = await campaignForMember(store, campaignId, userId);
  const latest = await repo.latestDeposit(campaign.id);
  if (latest?.status === "confirmed") return view(latest, now);
  if (campaign.status !== "open") {
    throw walletError(errorCodes.invalidTransition, "This brief is not open");
  }
  const recipient = campaignWalletAddress();
  if (!escrowOn() || !recipient) {
    throw walletError("BILLING_UNAVAILABLE", "Crypto payments are not on");
  }
  const payer = await verifiedPayerWallet(userId, now);
  if (!payer) {
    throw walletError("WALLET_REQUIRED", "Sign in with the wallet first");
  }
  const chain = chainByChainId(payer.chainId);
  if (!chain) {
    throw walletError("CHAIN_UNSUPPORTED", "Use a supported network");
  }
  const contract = tokenContract(chain.id, parsed.data.token);
  if (!contract) {
    throw walletError("TOKEN_UNSUPPORTED", "This token is not on this network");
  }
  const amount = BigInt(
    ugcBudgetMinor(campaign.videosWanted, Number(campaign.bountyMinor)),
  );
  if (
    latest &&
    latest.status === "open" &&
    new Date(latest.expires_at) > now &&
    latest.chain === chain.id &&
    latest.token === parsed.data.token &&
    latest.payer_address === payer.address &&
    BigInt(latest.amount_minor) === amount
  ) {
    return view(latest, now);
  }
  const row = await repo.insertDeposit({
    campaignId: campaign.id,
    payerUserId: userId,
    chain: chain.id,
    token: parsed.data.token,
    tokenContract: contract,
    recipient,
    payerAddress: payer.address,
    amountMinor: amount,
    tokenAmount: tokenUnits(amount),
    expiresAt: new Date(now.getTime() + DEPOSIT_MS),
  });
  return view(row, now);
}

async function readTransfer(input: {
  chain: string;
  hash: string;
  tokenContract: string;
  recipient: string;
  payer: string;
  amountMinor: bigint;
  since: Date;
}): Promise<VerifyResult> {
  const chain = chainById(input.chain);
  if (!chain) return { ok: false, reason: "missing" };
  const snapshot = await chainReader(chain.id, input.hash as `0x${string}`);
  const sanctioned =
    (await isSanctionedAddress(input.payer)) ||
    (await isSanctionedAddress(input.recipient));
  return verifyTransfer({
    receipt: snapshot.receipt,
    blockTimestamp: snapshot.blockTimestamp,
    confirmations: snapshot.confirmations,
    requiredConfirmations: chain.confirmations,
    tokenContract: input.tokenContract,
    recipient: input.recipient,
    payer: input.payer,
    amount: tokenUnits(input.amountMinor),
    orderCreatedAt: Math.floor(input.since.getTime() / 1000),
    sanctioned,
  });
}

/**
 * The payer hands in the transaction hash. Every check runs on the server:
 * receipt, token contract, recipient (the platform wallet), sender, amount,
 * age, confirmations and the sanctions list. Only then offers open.
 */
export async function confirmCampaignDeposit(
  userId: string | null,
  depositId: string,
  rawHash: unknown,
  now = new Date(),
): Promise<DepositView> {
  if (!userId) throw unauthenticated();
  const deposit = await repo.findDeposit(depositId);
  if (!deposit || deposit.payer_user_id !== userId) throw notFound();
  if (typeof rawHash !== "string" || !HASH.test(rawHash)) {
    throw validationError("Missing transaction");
  }
  const hash = rawHash.toLowerCase();
  if (deposit.status === "confirmed") return view(deposit, now);
  const next = settlement(
    await readTransfer({
      chain: deposit.chain,
      hash,
      tokenContract: deposit.token_contract,
      recipient: deposit.recipient,
      payer: deposit.payer_address,
      amountMinor: BigInt(deposit.amount_minor),
      since: new Date(deposit.created_at),
    }),
  );
  if (!next.grant) {
    const status = next.status === "expired" ? "failed" : next.status;
    if (status !== "open" && status !== "confirmed") {
      await repo.markDeposit(deposit.id, status, next.reason, hash);
    }
    if (status === "frozen" && deposit.status !== "frozen") {
      await alertOwners("UGC deposit frozen for review", [
        "A UGC brief deposit was frozen: an address is on the OFAC SDN list.",
        `Deposit: ${deposit.id}`,
        `Network: ${deposit.chain}`,
        `Transaction: ${hash}`,
        "Offers on the brief stay closed.",
      ]);
    }
    return view((await repo.findDeposit(deposit.id)) ?? deposit, now);
  }
  if (await repo.txUsed(deposit.chain, hash)) {
    throw walletError("HASH_USED", "This transaction is already counted");
  }
  try {
    await repo.confirmDeposit(deposit.id, hash);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw walletError("HASH_USED", "This transaction is already counted");
    }
    throw error;
  }
  const store = await db();
  await store.audit(userId, "ugc.deposit_confirmed", deposit.id, "ugc_deposit");
  return view((await repo.findDeposit(deposit.id)) ?? deposit, now);
}

/** The payer's poll of one deposit; a submitted one is checked again. */
export async function refreshCampaignDeposit(
  userId: string | null,
  depositId: string,
  now = new Date(),
): Promise<DepositView> {
  if (!userId) throw unauthenticated();
  const deposit = await repo.findDeposit(depositId);
  if (!deposit || deposit.payer_user_id !== userId) throw notFound();
  if (deposit.status === "submitted" && deposit.tx_hash) {
    return confirmCampaignDeposit(userId, deposit.id, deposit.tx_hash, now);
  }
  return view(deposit, now);
}

/** Cron (`/api/cron/ugc`): deposits still waiting on confirmations. */
export async function recheckCampaignDeposits(
  now = new Date(),
  limit = 20,
): Promise<number> {
  let checked = 0;
  for (const row of await repo.submittedDeposits(limit)) {
    if (!row.payer_user_id || !row.tx_hash) continue;
    try {
      await confirmCampaignDeposit(row.payer_user_id, row.id, row.tx_hash, now);
      checked += 1;
    } catch (error) {
      logger.warn({ err: error, depositId: row.id }, "ugc: recheck failed");
    }
  }
  return checked;
}

const txInput = z
  .object({
    chain: z.string().max(32),
    token: z.enum(["USDC", "USDT"]),
    txHash: z.string().regex(HASH),
  })
  .strict();

/** A transfer sent by hand from the platform wallet, checked like a deposit. */
async function outgoing(
  raw: unknown,
  recipient: string,
  amountMinor: bigint,
  since: Date,
) {
  const parsed = txInput.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues);
  const chain = chainById(parsed.data.chain);
  if (!chain) throw walletError("CHAIN_UNSUPPORTED", "Use a supported network");
  const contract = tokenContract(chain.id, parsed.data.token);
  if (!contract) {
    throw walletError("TOKEN_UNSUPPORTED", "This token is not on this network");
  }
  const wallet = campaignWalletAddress();
  if (!wallet) {
    throw walletError("BILLING_UNAVAILABLE", "The platform wallet is not set");
  }
  const hash = parsed.data.txHash.toLowerCase();
  if (await repo.txUsed(chain.id, hash)) {
    throw walletError("HASH_USED", "This transaction is already counted");
  }
  const checked = await readTransfer({
    chain: chain.id,
    hash,
    tokenContract: contract,
    recipient,
    payer: wallet,
    amountMinor,
    since,
  });
  if (!checked.ok) {
    if (checked.reason === "confirmations" || checked.reason === "missing") {
      throw walletError(
        UGC_ERRORS.txPending,
        "The transaction is not confirmed yet",
      );
    }
    if (checked.reason === "sanctioned") {
      await alertOwners("UGC transfer refused for review", [
        "A UGC transfer touches an address on the OFAC SDN list.",
        `Network: ${chain.id}`,
        `Transaction: ${hash}`,
        "Nothing was marked.",
      ]);
      throw walletError("PAYOUT_UNDER_REVIEW", "This transfer is under review");
    }
    throw walletError(
      UGC_ERRORS.txInvalid,
      `The transaction does not match: ${checked.reason}`,
    );
  }
  return { chain: chain.id, token: parsed.data.token, hash };
}

/**
 * An admin records a reward sent from the campaign wallet. The server checks
 * the creator's proven address, the amount of the snapshot, the sender and
 * that the transfer came after the reward was owed.
 */
export async function payRewardByTx(input: {
  adminId: string | null;
  isAdmin: boolean;
  payoutId: string;
  tx: unknown;
}) {
  if (!input.isAdmin) throw notFound();
  if (!input.adminId) throw unauthenticated();
  const payout = await repo.payoutForTx(input.payoutId);
  if (!payout) throw notFound();
  if (payout.status !== "owed") {
    throw walletError(
      errorCodes.invalidTransition,
      "This reward is already marked",
    );
  }
  const store = await db();
  await assertNoOpenDispute(store, payout.invite_id);
  if ((await store.confirmedDepositMinor(payout.campaign_id)) === null) {
    throw walletError(
      UGC_ERRORS.depositRequired,
      "This brief has no paid budget: mark the reward by hand",
    );
  }
  // The account wallet at payout time (D518); a change waits for this.
  const address =
    (await readAccountWallet(payout.creator_user_id))?.address ?? null;
  if (!address) {
    throw walletError(
      "PAYOUT_WALLET_REQUIRED",
      "The creator has no payout address",
    );
  }
  const tx = await outgoing(
    input.tx,
    address,
    BigInt(payout.amount_minor),
    new Date(payout.created_at),
  );
  let marked = false;
  try {
    marked = await repo.markPayoutPaidByTx({
      payoutId: payout.id,
      adminId: input.adminId,
      chain: tx.chain,
      token: tx.token,
      recipient: address,
      txHash: tx.hash,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw walletError("HASH_USED", "This transaction is already counted");
    }
    throw error;
  }
  if (!marked) {
    throw walletError(
      errorCodes.invalidTransition,
      "This reward is already marked",
    );
  }
  await store.audit(input.adminId, "ugc.payout_paid", payout.id, "ugc_payout");
  return { id: payout.id, status: "paid" as const, txHash: tx.hash };
}

/**
 * An admin records the rest of a closed brief sent back to the address the
 * budget came from: the budget minus every recorded reward.
 */
export async function refundByTx(input: {
  adminId: string | null;
  isAdmin: boolean;
  campaignId: string;
  tx: unknown;
}) {
  if (!input.isAdmin) throw notFound();
  if (!input.adminId) throw unauthenticated();
  const store = await db();
  const campaign = await store.getCampaign(input.campaignId);
  if (!campaign) throw notFound();
  const deposit = await repo.latestDeposit(campaign.id);
  if (!deposit || deposit.status !== "confirmed") {
    throw walletError(UGC_ERRORS.depositRequired, "This brief has no budget");
  }
  if (await repo.findRefund(campaign.id)) {
    throw walletError(errorCodes.invalidTransition, "The rest is already back");
  }
  if (
    refundBlocked(campaign.status, await repo.submissionStatuses(campaign.id))
  ) {
    throw walletError(
      UGC_ERRORS.refundWait,
      "Close the brief and decide every handed-in video first",
    );
  }
  const rest = refundableMinor(
    BigInt(deposit.amount_minor),
    await repo.rewardsOfCampaign(campaign.id),
  );
  if (rest <= BigInt(0)) {
    throw walletError(UGC_ERRORS.nothingToRefund, "Nothing is left to return");
  }
  const tx = await outgoing(
    input.tx,
    deposit.payer_address,
    rest,
    new Date(deposit.created_at),
  );
  let refund: repo.RefundRow;
  try {
    refund = await repo.insertRefund({
      campaignId: campaign.id,
      depositId: deposit.id,
      amountMinor: rest,
      chain: tx.chain,
      token: tx.token,
      recipient: deposit.payer_address,
      txHash: tx.hash,
      adminId: input.adminId,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw walletError("HASH_USED", "This transaction is already counted");
    }
    throw error;
  }
  await store.audit(input.adminId, "ugc.refund_sent", refund.id, "ugc_refund");
  return { id: refund.id, amountMinor: rest.toString(), txHash: tx.hash };
}

export type WalletPayoutRow = {
  id: string;
  productName: string;
  displayName: string;
  amountMinor: string;
  /** The brief has a paid budget: the reward goes out with a transaction. */
  fromWallet: boolean;
  /** The creator's proven address, when there is one. */
  payoutAddress: string | null;
  /** A problem is open on the order: the reward waits (U7). */
  disputeOpen: boolean;
};

/** Owed rewards for the admin, with how each one is settled. */
export async function listWalletPayouts(
  isAdmin: boolean,
): Promise<WalletPayoutRow[]> {
  if (!isAdmin) throw notFound();
  const store = await db();
  const rows: WalletPayoutRow[] = [];
  for (const payout of await store.listOwedPayouts()) {
    const invite = await store.getInvite(payout.inviteId);
    if (!invite) continue;
    const campaign = await store.getCampaign(invite.campaignId);
    const profile = await store.getProfile(invite.creatorUserId);
    const fromWallet =
      (await store.confirmedDepositMinor(invite.campaignId)) !== null;
    rows.push({
      id: payout.id,
      productName: campaign?.productName ?? "",
      displayName: profile?.displayName ?? "",
      amountMinor: payout.amountMinor.toString(),
      fromWallet,
      payoutAddress: fromWallet
        ? ((await readAccountWallet(invite.creatorUserId))?.address ?? null)
        : null,
      disputeOpen: await hasOpenDispute(store, invite.id),
    });
  }
  return rows;
}

export type RefundDueRow = {
  campaignId: string;
  productName: string;
  amountMinor: string;
  recipient: string;
  /** A handed-in video still waits for the company's decision. */
  waiting: boolean;
};

/** Closed briefs whose rest has not gone back yet. */
export async function listRefundsDue(
  isAdmin: boolean,
): Promise<RefundDueRow[]> {
  if (!isAdmin) throw notFound();
  const rows: RefundDueRow[] = [];
  for (const row of await repo.closedWithDeposit()) {
    const deposit = await repo.latestDeposit(row.campaign_id);
    if (!deposit || deposit.status !== "confirmed") continue;
    const rest = refundableMinor(
      BigInt(deposit.amount_minor),
      await repo.rewardsOfCampaign(row.campaign_id),
    );
    if (rest <= BigInt(0)) continue;
    rows.push({
      campaignId: row.campaign_id,
      productName: row.product_name,
      amountMinor: rest.toString(),
      recipient: deposit.payer_address,
      waiting: refundBlocked(
        "closed",
        await repo.submissionStatuses(row.campaign_id),
      ),
    });
  }
  return rows;
}

/** Owed rewards that hold the creator's wallet in place (D518). */
export async function owedWalletRewards(creatorId: string): Promise<number> {
  return repo.owedWalletRewards(creatorId);
}

/**
 * The money of one order for one of its two parties (U7): the budget paid in
 * and what came back (company only), what was earned and what was paid.
 */
export async function orderMoneyHistory(
  userId: string | null,
  inviteId: string,
) {
  if (!userId) throw unauthenticated();
  const store = await db();
  const { invite, side } = await roomParty(store, inviteId, userId);
  const submission = await store.getSubmission(invite.id);
  const payout = submission
    ? await store.getPayoutBySubmission(submission.id)
    : null;
  let deposit: { at: string; amountMinor: string } | null = null;
  let refund: { at: string; amountMinor: string } | null = null;
  if (side === "company") {
    const row = await repo.latestDeposit(invite.campaignId);
    if (row?.status === "confirmed") {
      deposit = {
        at: new Date(row.created_at).toISOString(),
        amountMinor: row.amount_minor,
      };
    }
    const back = await repo.findRefund(invite.campaignId);
    if (back) {
      refund = {
        at: new Date(back.created_at).toISOString(),
        amountMinor: back.amount_minor,
      };
    }
  }
  return buildMoneyHistory({
    side,
    deposit,
    refund,
    payout: payout
      ? {
          amountMinor: payout.amountMinor.toString(),
          createdAt: payout.createdAt ?? null,
          paidAt: payout.paidAt,
        }
      : null,
  });
}
