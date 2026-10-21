import { randomBytes } from "node:crypto";
import { z } from "zod";
import { chainByChainId } from "@/lib/billing/chains";
import {
  recoverSiweAddress,
  siweMessage,
  validAddress,
} from "@/lib/billing/siwe";
import { recordAudit } from "@/lib/audit";
import { forbidden, HttpError, validationError } from "@/lib/http";
import { logger } from "@/lib/logger";
import * as repo from "../repo/wallet-repo";

/**
 * The crypto wallet of the account (D518). WalletConnect or a browser wallet
 * connects; only a SIWE signature checked here links the address. No seed
 * phrase or key is ever asked for or kept. Freelance payments and UGC
 * rewards are sent to this address; each payment keeps its own recipient,
 * so a change never moves money already on its way.
 */

export const WALLET_STATEMENT =
  "Link this wallet to my INTGETION JOB LIST account for payouts.";

const NONCE_MS = 10 * 60 * 1000;
const UNIQUE_VIOLATION = "23505";

export const WALLET_ERRORS = {
  taken: "WALLET_TAKEN",
  review: "WALLET_UNDER_REVIEW",
  payoutsPending: "WALLET_PAYOUTS_PENDING",
} as const;

export type AccountWallet = {
  address: string;
  chainId: number | null;
  verifiedAt: string;
};

/** The proven address of the account, or null. */
export async function readAccountWallet(
  userId: string,
): Promise<AccountWallet | null> {
  const row = await repo.findWallet(userId);
  if (!row?.address || !row.verified_at) return null;
  return {
    address: row.address,
    chainId: row.chain_id,
    verifiedAt: row.verified_at,
  };
}

export type WalletImpact = {
  /** Freelance payments a buyer opened to the current address. */
  openPayments: number;
  /** Accepted orders not paid yet: new payments follow the new address. */
  unpaidOrders: number;
  /** UGC rewards owed from a paid-in budget, sent at payout time. */
  owedRewards: number;
  /** Change and disconnect wait until owed rewards are paid. */
  blocked: boolean;
};

/**
 * What a change or a disconnect would touch (D518). Open freelance payments
 * keep their recipient and still settle; owed UGC rewards read the address
 * when they are paid, so they block the change instead of being redirected.
 */
export async function walletChangeImpact(
  userId: string,
): Promise<WalletImpact> {
  const wallet = await readAccountWallet(userId);
  if (!wallet)
    return { openPayments: 0, unpaidOrders: 0, owedRewards: 0, blocked: false };
  // Loaded on demand: these modules read the wallet through this one.
  const [{ walletPaymentsInFlight }, { owedWalletRewards }] = await Promise.all(
    [import("@/modules/freelance/service"), import("@/modules/ugc/service")],
  );
  const [freelance, owedRewards] = await Promise.all([
    walletPaymentsInFlight(userId, wallet.address),
    owedWalletRewards(userId),
  ]);
  return { ...freelance, owedRewards, blocked: owedRewards > 0 };
}

async function refuseIfBlocked(userId: string): Promise<void> {
  if ((await walletChangeImpact(userId)).blocked) {
    throw new HttpError(
      409,
      WALLET_ERRORS.payoutsPending,
      "Owed rewards go to the current address first",
    );
  }
}

/** Step one: the one-time message the wallet signs. */
export async function issueAccountWalletNonce(
  userId: string,
  raw: unknown,
  now = new Date(),
): Promise<{ message: string }> {
  const parsed = z
    .object({ address: z.string().max(64), chainId: z.number().int() })
    .strict()
    .safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues);
  const checksum = validAddress(parsed.data.address);
  const chain = chainByChainId(parsed.data.chainId);
  if (!checksum || !chain) throw validationError("Unknown wallet or network");
  const address = checksum.toLowerCase();
  const owner = await repo.ownerOfAddress(address);
  if (owner && owner !== userId) {
    throw new HttpError(
      409,
      WALLET_ERRORS.taken,
      "This wallet is linked to another account",
    );
  }
  await refuseIfBlocked(userId);
  const expires = new Date(now.getTime() + NONCE_MS);
  const message = siweMessage({
    address: checksum,
    chainId: chain.chainId,
    nonce: randomBytes(16).toString("hex"),
    issuedAt: now.toISOString(),
    expirationTime: expires.toISOString(),
    statement: WALLET_STATEMENT,
  });
  await repo.savePending({
    userId,
    address,
    chainId: chain.chainId,
    message,
    expiresAt: expires,
  });
  return { message };
}

/**
 * Step two: the signature proves the address and links it. An address on
 * the sanctions list is not saved; the owners hear of it.
 */
export async function verifyAccountWalletSignature(
  userId: string,
  raw: unknown,
  now = new Date(),
): Promise<AccountWallet> {
  const parsed = z
    .object({
      signature: z
        .string()
        .regex(/^0x[0-9a-fA-F]+$/)
        .max(400),
    })
    .strict()
    .safeParse(raw);
  if (!parsed.success) throw validationError("Missing signature");
  const row = await repo.findWallet(userId);
  if (
    !row?.pending_message ||
    !row.pending_address ||
    !row.pending_expires_at ||
    new Date(row.pending_expires_at) <= now
  ) {
    throw forbidden();
  }
  const recovered = await recoverSiweAddress(
    row.pending_message,
    parsed.data.signature as `0x${string}`,
  );
  if (recovered !== row.pending_address) throw forbidden();
  await refuseIfBlocked(userId);
  const { isSanctionedAddress } = await import("@/modules/billing/service");
  if (await isSanctionedAddress(row.pending_address)) {
    await alertOwners("Wallet refused for review", [
      "Someone tried to link a wallet on the OFAC SDN list to an account.",
      `User: ${userId}`,
      "The address was not saved.",
    ]);
    throw new HttpError(409, WALLET_ERRORS.review, "This wallet is on review");
  }
  const previous = row.address;
  let saved: repo.WalletRow | null;
  try {
    saved = await repo.confirmPending({
      userId,
      message: row.pending_message,
      signature: parsed.data.signature,
    });
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      throw new HttpError(
        409,
        WALLET_ERRORS.taken,
        "This wallet is linked to another account",
      );
    }
    throw error;
  }
  if (!saved?.address || !saved.verified_at) throw forbidden();
  await recordAudit({
    actorId: userId,
    action: previous ? "account.wallet_change" : "account.wallet_link",
    entityType: "user_wallet",
    entityId: userId,
    diff: { from: previous, to: saved.address },
  });
  return {
    address: saved.address,
    chainId: saved.chain_id,
    verifiedAt: saved.verified_at,
  };
}

/** Disconnect the wallet. Payment history keeps its own addresses. */
export async function disconnectAccountWallet(userId: string): Promise<void> {
  await refuseIfBlocked(userId);
  const previous = await repo.clearWallet(userId);
  if (!previous) return;
  await recordAudit({
    actorId: userId,
    action: "account.wallet_unlink",
    entityType: "user_wallet",
    entityId: userId,
    diff: { from: previous },
  });
}

async function alertOwners(subject: string, lines: string[]) {
  logger.warn({ alert: "account_wallet_review" }, subject);
  try {
    const { notifyPlatformOwners } =
      await import("@/modules/admin-console/service");
    await notifyPlatformOwners(subject, lines.join("\n"));
  } catch (error) {
    logger.error({ err: error }, "account wallet: owner alert failed");
  }
}
