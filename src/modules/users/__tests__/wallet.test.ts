import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletRow } from "../repo/wallet-repo";

const ME = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";

const rows = vi.hoisted(() => new Map<string, WalletRow & { sig?: string }>());
const audits = vi.hoisted(() => [] as Array<{ action: string; diff: unknown }>);
const owed = vi.hoisted(() => ({ n: 0 }));
const sanctioned = vi.hoisted(() => new Set<string>());

vi.mock("@/lib/audit", () => ({
  recordAudit: (entry: { action: string; diff: unknown }) => {
    audits.push(entry);
    return Promise.resolve();
  },
}));

vi.mock("@/modules/freelance/service", () => ({
  walletPaymentsInFlight: () =>
    Promise.resolve({ openPayments: 1, unpaidOrders: 2 }),
}));

vi.mock("@/modules/ugc/service", () => ({
  owedWalletRewards: () => Promise.resolve(owed.n),
}));

vi.mock("@/modules/billing/service", () => ({
  isSanctionedAddress: (address: string) =>
    Promise.resolve(sanctioned.has(address)),
}));

vi.mock("@/modules/admin-console/service", () => ({
  notifyPlatformOwners: () => Promise.resolve(),
}));

vi.mock("../repo/wallet-repo", () => ({
  findWallet: (userId: string) => Promise.resolve(rows.get(userId) ?? null),
  ownerOfAddress: (address: string) =>
    Promise.resolve(
      [...rows.values()].find((row) => row.address === address)?.user_id ??
        null,
    ),
  savePending: (input: {
    userId: string;
    address: string;
    chainId: number;
    message: string;
    expiresAt: Date;
  }) => {
    const row = rows.get(input.userId) ?? {
      user_id: input.userId,
      address: null,
      chain_id: null,
      verified_at: null,
      pending_address: null,
      pending_chain_id: null,
      pending_message: null,
      pending_expires_at: null,
    };
    rows.set(input.userId, {
      ...row,
      pending_address: input.address,
      pending_chain_id: input.chainId,
      pending_message: input.message,
      pending_expires_at: input.expiresAt.toISOString(),
    });
    return Promise.resolve();
  },
  confirmPending: (input: { userId: string; message: string }) => {
    const row = rows.get(input.userId);
    if (!row || row.pending_message !== input.message)
      return Promise.resolve(null);
    const taken = [...rows.values()].some(
      (other) =>
        other.user_id !== input.userId && other.address === row.pending_address,
    );
    if (taken)
      return Promise.reject(Object.assign(new Error("dup"), { code: "23505" }));
    const next = {
      ...row,
      address: row.pending_address,
      chain_id: row.pending_chain_id,
      verified_at: "2026-10-21T10:00:00Z",
      pending_address: null,
      pending_chain_id: null,
      pending_message: null,
      pending_expires_at: null,
    };
    rows.set(input.userId, next);
    return Promise.resolve(next);
  },
  clearWallet: (userId: string) => {
    const row = rows.get(userId);
    const previous = row?.address ?? null;
    if (row) rows.set(userId, { ...row, address: null, verified_at: null });
    return Promise.resolve(previous);
  },
}));

const {
  disconnectAccountWallet,
  issueAccountWalletNonce,
  readAccountWallet,
  verifyAccountWalletSignature,
  walletChangeImpact,
} = await import("../service/wallet");

const NOW = new Date("2026-10-21T09:59:00Z");

async function link(
  userId: string,
  account = privateKeyToAccount(generatePrivateKey()),
) {
  const { message } = await issueAccountWalletNonce(
    userId,
    { address: account.address, chainId: 8453 },
    NOW,
  );
  const wallet = await verifyAccountWalletSignature(
    userId,
    { signature: await account.signMessage({ message }) },
    NOW,
  );
  return { account, message, wallet };
}

describe("account wallet (D518)", () => {
  beforeEach(() => {
    rows.clear();
    audits.length = 0;
    owed.n = 0;
    sanctioned.clear();
  });

  it("links only the address that signed the one-time message", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const { message } = await issueAccountWalletNonce(
      ME,
      { address: owner.address, chainId: 8453 },
      NOW,
    );
    expect(message).toContain(
      "Link this wallet to my INTGETION JOB LIST account",
    );
    expect(message).not.toMatch(/seed|private key/i);
    const stranger = privateKeyToAccount(generatePrivateKey());
    await expect(
      verifyAccountWalletSignature(
        ME,
        { signature: await stranger.signMessage({ message }) },
        NOW,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(await readAccountWallet(ME)).toBeNull();
    const wallet = await verifyAccountWalletSignature(
      ME,
      { signature: await owner.signMessage({ message }) },
      NOW,
    );
    expect(wallet.address).toBe(owner.address.toLowerCase());
    expect(audits.at(-1)).toMatchObject({ action: "account.wallet_link" });
  });

  it("refuses an expired message and an unknown network", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const { message } = await issueAccountWalletNonce(
      ME,
      { address: owner.address, chainId: 8453 },
      NOW,
    );
    await expect(
      verifyAccountWalletSignature(
        ME,
        { signature: await owner.signMessage({ message }) },
        new Date(NOW.getTime() + 11 * 60 * 1000),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      issueAccountWalletNonce(
        ME,
        { address: owner.address, chainId: 999999 },
        NOW,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("gives one proven address to one account only", async () => {
    const { account } = await link(OTHER);
    await expect(
      issueAccountWalletNonce(
        ME,
        { address: account.address, chainId: 8453 },
        NOW,
      ),
    ).rejects.toMatchObject({ status: 409, code: "WALLET_TAKEN" });
  });

  it("does not save an address on the sanctions list", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    sanctioned.add(owner.address.toLowerCase());
    await expect(link(ME, owner)).rejects.toMatchObject({
      code: "WALLET_UNDER_REVIEW",
    });
    expect(await readAccountWallet(ME)).toBeNull();
  });

  it("changes the wallet with a new signature and records the change", async () => {
    const first = await link(ME);
    const second = await link(ME);
    expect(second.wallet.address).not.toBe(first.wallet.address);
    expect(audits.at(-1)).toMatchObject({
      action: "account.wallet_change",
      diff: { from: first.wallet.address, to: second.wallet.address },
    });
  });

  it("holds the wallet while UGC rewards are owed to it, never redirecting them", async () => {
    await link(ME);
    owed.n = 2;
    const impact = await walletChangeImpact(ME);
    expect(impact).toEqual({
      openPayments: 1,
      unpaidOrders: 2,
      owedRewards: 2,
      blocked: true,
    });
    const next = privateKeyToAccount(generatePrivateKey());
    await expect(
      issueAccountWalletNonce(
        ME,
        { address: next.address, chainId: 8453 },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "WALLET_PAYOUTS_PENDING" });
    await expect(disconnectAccountWallet(ME)).rejects.toMatchObject({
      code: "WALLET_PAYOUTS_PENDING",
    });
    expect(await readAccountWallet(ME)).not.toBeNull();
  });

  it("links a first wallet even while rewards are owed, then disconnects when free", async () => {
    owed.n = 1;
    await link(ME);
    owed.n = 0;
    await disconnectAccountWallet(ME);
    expect(await readAccountWallet(ME)).toBeNull();
    expect(audits.at(-1)).toMatchObject({ action: "account.wallet_unlink" });
  });
});
