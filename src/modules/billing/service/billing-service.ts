import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { chainById, tokenContract } from "@/lib/billing/chains";
import { readChain } from "@/lib/billing/rpc";
import { recoverSiweAddress, siweMessage, validAddress } from "@/lib/billing/siwe";
import {
  clientStatus,
  HIRE_DAYS,
  HIRE_PLAN,
  formatTokenAmount,
  HIRE_PRICE_MINOR,
  hireGrants,
  settlement,
  type ClientBillingStatus,
  type OrderStatus,
} from "@/lib/billing/status";
import { tokenUnits, verifyTransfer } from "@/lib/billing/verify-transfer";
import { forbidden, HttpError, notFound, validationError } from "@/lib/http";
import { findMemberRole } from "@/modules/companies/service";

type OrderRow = {
  id: string;
  purchase_id: string;
  user_id: string;
  job_id: string;
  company_id: string;
  chain: string;
  token: string;
  token_contract: string;
  recipient: string;
  payer_address: string;
  amount_minor: string;
  token_amount: string;
  status: OrderStatus;
  reason: string | null;
  tx_hash: string | null;
  expires_at: string;
  created_at: string;
};

export type OrderView = {
  id: string;
  jobId: string;
  status: ClientBillingStatus;
  plan: "start" | "hire";
  chain: string;
  chainId: number;
  token: string;
  tokenContract: string;
  recipient: string;
  tokenAmount: string;
  expiresAt: string;
};

export type BillingMe = {
  plan: "start" | "hire";
  crypto: boolean;
  hires: { jobId: string; validUntil: string }[];
};

function cryptoReady(chain: string, token: string): boolean {
  return (
    process.env.BILLING_ENABLED === "true" &&
    process.env.BILLING_CRYPTO_PROVIDER === "walletconnect" &&
    validAddress(process.env.COMPANY_WALLET_ADDRESS ?? "") !== null &&
    tokenContract(chain, token) !== null
  );
}

function view(row: OrderRow, now = new Date()): OrderView {
  const status = clientStatus({
    status: row.status,
    reason: row.reason,
    expiresAt: new Date(row.expires_at),
    now,
  });
  const chain = chainById(row.chain);
  return {
    id: row.id,
    jobId: row.job_id,
    status,
    plan: status === "paid" ? "hire" : "start",
    chain: row.chain,
    chainId: chain?.chainId ?? 0,
    token: row.token,
    tokenContract: row.token_contract,
    recipient: row.recipient,
    tokenAmount: formatTokenAmount(row.token_amount),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

async function loadOrder(orderId: string, userId: string): Promise<OrderRow> {
  const rows = await getDb().execute<OrderRow>(sql`
    select o.id, o.purchase_id, o.user_id, p.job_id, p.company_id, o.chain, o.token,
           o.token_contract, o.recipient, o.payer_address, o.amount_minor::text,
           o.token_amount, o.status, o.reason, o.tx_hash,
           o.expires_at::text, o.created_at::text
    from crypto_orders o
    join purchases p on p.id = o.purchase_id
    where o.id = ${orderId} and o.user_id = ${userId}
  `);
  const row = rows[0];
  if (!row) throw notFound();
  return row;
}

/** Published jobs this owner can pay Hire for. */
export async function payableJobs(
  userId: string,
): Promise<{ id: string; title: string }[]> {
  return getDb().execute<{ id: string; title: string }>(sql`
    select j.id, j.title
    from jobs j
    join company_members m on m.company_id = j.company_id
    where m.user_id = ${userId}
      and m.role = 'owner'
      and j.source = 'internal'
      and j.status = 'published'
    order by j.created_at desc
    limit 20
  `);
}

export async function billingMe(userId: string): Promise<BillingMe> {
  const rows = await getDb().execute<{ job_id: string; valid_until: string }>(sql`
    select p.job_id, p.valid_until::text
    from purchases p
    join company_members m on m.company_id = p.company_id
    where m.user_id = ${userId}
      and p.plan_code = ${HIRE_PLAN}
      and p.status = 'paid'
      and p.valid_until > now()
  `);
  return {
    plan: rows.length > 0 ? "hire" : "start",
    crypto: cryptoReady("base", "USDC") || cryptoReady("base", "USDT"),
    hires: rows.map((row) => ({
      jobId: row.job_id,
      validUntil: new Date(row.valid_until).toISOString(),
    })),
  };
}

export async function hireForJob(jobId: string): Promise<boolean> {
  const rows = await getDb().execute<{ id: string }>(sql`
    select id from purchases
    where job_id = ${jobId}
      and plan_code = ${HIRE_PLAN}
      and status = 'paid'
      and valid_until > now()
    limit 1
  `);
  return Boolean(rows[0]);
}

export function hireFeatures() {
  return hireGrants();
}

export async function issueWalletNonce(
  userId: string,
  address: string,
  chainId: number,
): Promise<{ message: string }> {
  const checksum = validAddress(address);
  const chain = chainById(
    chainByChain(chainId),
  );
  if (!checksum || !chain) throw validationError("Unknown wallet or network");
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiration = new Date(issuedAt.getTime() + 10 * 60 * 1000);
  const message = siweMessage({
    address: checksum,
    chainId: chain.chainId,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: expiration.toISOString(),
  });
  await getDb().execute(sql`
    insert into billing_wallet_sessions (user_id, address, chain_id, nonce, message, expires_at)
    values (${userId}, ${checksum.toLowerCase()}, ${chain.chainId}, ${nonce}, ${message}, ${expiration.toISOString()})
    on conflict (user_id) do update
      set address = excluded.address,
          chain_id = excluded.chain_id,
          nonce = excluded.nonce,
          message = excluded.message,
          expires_at = excluded.expires_at
  `);
  return { message };
}

function chainByChain(chainId: number): string {
  if (chainId === 1) return "ethereum";
  if (chainId === 137) return "polygon";
  if (chainId === 42161) return "arbitrum";
  if (chainId === 8453) return "base";
  return "";
}

export async function verifyWalletSignature(
  userId: string,
  signature: string,
): Promise<void> {
  if (!signature.startsWith("0x")) throw validationError("Missing signature");
  const rows = await getDb().execute<{
    address: string;
    message: string | null;
    expires_at: string;
    nonce: string;
  }>(sql`
    select address, message, expires_at::text, nonce
    from billing_wallet_sessions
    where user_id = ${userId}
  `);
  const session = rows[0];
  if (!session?.message || new Date(session.expires_at) <= new Date()) {
    throw forbidden();
  }
  const recovered = await recoverSiweAddress(
    session.message,
    signature as `0x${string}`,
  );
  if (!recovered || recovered !== session.address.toLowerCase()) throw forbidden();
  const until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await getDb().execute(sql`
    update billing_wallet_sessions
    set nonce = 'verified', expires_at = ${until}
    where user_id = ${userId} and nonce = ${session.nonce}
  `);
}

export async function createHireOrder(
  userId: string,
  jobId: string,
  token: "USDC" | "USDT",
): Promise<OrderView> {
  const job = await getDb().execute<{
    company_id: string;
    source: string;
    status: string;
  }>(sql`
    select company_id, source, status from jobs where id = ${jobId}
  `);
  const row = job[0];
  if (!row || row.source !== "internal") throw notFound();
  if (row.status !== "published") {
    throw new HttpError(409, "JOB_NOT_PUBLISHED", "Publish the job first");
  }
  const role = await findMemberRole(row.company_id, userId);
  if (role !== "owner") throw forbidden();

  const session = await getDb().execute<{
    address: string;
    chain_id: number;
    nonce: string;
    expires_at: string;
  }>(sql`
    select address, chain_id, nonce, expires_at::text
    from billing_wallet_sessions
    where user_id = ${userId}
  `);
  const wallet = session[0];
  if (!wallet || wallet.nonce !== "verified" || new Date(wallet.expires_at) <= new Date()) {
    throw new HttpError(409, "WALLET_REQUIRED", "Sign in with the wallet first");
  }
  const chainName = chainByChain(wallet.chain_id);
  const chain = chainById(chainName);
  const contract = tokenContract(chainName, token);
  const recipient = validAddress(process.env.COMPANY_WALLET_ADDRESS ?? "");
  if (!chain || !contract || !recipient || !cryptoReady(chainName, token)) {
    throw new HttpError(409, "BILLING_UNAVAILABLE", "Crypto payments are not on");
  }

  const existing = await getDb().execute<{ id: string }>(sql`
    select o.id
    from crypto_orders o
    join purchases p on p.id = o.purchase_id
    where p.job_id = ${jobId} and p.status = 'paid' and p.valid_until > now()
    limit 1
  `);
  if (existing[0]) {
    const paid = await getDb().execute<OrderRow>(sql`
      select o.id, o.purchase_id, o.user_id, p.job_id, p.company_id, o.chain, o.token,
             o.token_contract, o.recipient, o.payer_address, o.amount_minor::text,
             o.token_amount, o.status, o.reason, o.tx_hash,
             o.expires_at::text, o.created_at::text
      from crypto_orders o
      join purchases p on p.id = o.purchase_id
      where o.id = ${existing[0].id}
    `);
    if (paid[0]) return view(paid[0]);
  }

  const units = tokenUnits(HIRE_PRICE_MINOR).toString();
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const created = await getDb().transaction(async (tx) => {
    const purchase = await tx.execute<{ id: string }>(sql`
      insert into purchases (company_id, job_id, plan_code, status)
      values (${row.company_id}, ${jobId}, ${HIRE_PLAN}, 'pending')
      returning id
    `);
    const purchaseId = purchase[0]?.id;
    if (!purchaseId) throw new HttpError(500, "BILLING_FAILED", "Could not open the order");
    const order = await tx.execute<{ id: string }>(sql`
      insert into crypto_orders (
        purchase_id, user_id, chain, token, token_contract, recipient, payer_address,
        amount_minor, token_amount, status, expires_at
      )
      values (
        ${purchaseId}, ${userId}, ${chain.id}, ${token}, ${contract},
        ${recipient.toLowerCase()}, ${wallet.address.toLowerCase()},
        ${HIRE_PRICE_MINOR.toString()}, ${units}, 'open', ${expires}
      )
      returning id
    `);
    return order[0]?.id;
  });
  if (!created) throw new HttpError(500, "BILLING_FAILED", "Could not open the order");
  return view(await loadOrder(created, userId));
}

export async function confirmHireOrder(
  userId: string,
  orderId: string,
  txHash: string,
): Promise<OrderView & { granted: boolean }> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw validationError("Missing transaction");
  const order = await loadOrder(orderId, userId);
  if (order.status === "confirmed") return { ...view(order), granted: false };
  const chain = chainById(order.chain);
  if (!chain) throw notFound();
  const snapshot = await readChain(order.chain, txHash as `0x${string}`);
  const verified = verifyTransfer({
    receipt: snapshot.receipt,
    blockTimestamp: snapshot.blockTimestamp,
    confirmations: snapshot.confirmations,
    requiredConfirmations: chain.confirmations,
    tokenContract: order.token_contract,
    recipient: order.recipient,
    payer: order.payer_address,
    amount: BigInt(order.token_amount),
    orderCreatedAt: Math.floor(new Date(order.created_at).getTime() / 1000),
    sanctioned: false,
  });
  const next = settlement(verified);
  if (!next.grant) {
    await getDb().execute(sql`
      update crypto_orders
      set status = ${next.status}, reason = ${next.reason}, tx_hash = ${txHash}
      where id = ${order.id} and status <> 'confirmed'
    `);
    return { ...view(await loadOrder(order.id, userId)), granted: false };
  }
  const until = new Date(Date.now() + HIRE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  try {
    await getDb().transaction(async (tx) => {
      const used = await tx.execute<{ id: string }>(sql`
        select id from payments where chain = ${order.chain} and tx_hash = ${txHash}
      `);
      if (used[0]) throw new HttpError(409, "HASH_USED", "Already counted");
      await tx.execute(sql`
        update crypto_orders
        set status = 'confirmed', reason = null, tx_hash = ${txHash}
        where id = ${order.id} and status <> 'confirmed'
      `);
      await tx.execute(sql`
        insert into payments (purchase_id, amount_minor, currency, kind, chain, token, tx_hash, from_address)
        values (
          ${order.purchase_id}, ${order.amount_minor}, 'USD', 'charge',
          ${order.chain}, ${order.token}, ${txHash}, ${order.payer_address}
        )
      `);
      await tx.execute(sql`
        update purchases
        set status = 'paid', valid_until = ${until}
        where id = ${order.purchase_id} and status <> 'paid'
      `);
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(409, "HASH_USED", "Already counted");
  }
  return { ...view(await loadOrder(order.id, userId)), granted: true };
}

export async function refreshHireOrder(userId: string, orderId: string): Promise<OrderView> {
  const order = await loadOrder(orderId, userId);
  if (order.status === "submitted" && order.tx_hash) {
    return confirmHireOrder(userId, orderId, order.tx_hash);
  }
  return view(order);
}

export async function recheckSubmittedOrders(): Promise<number> {
  const rows = await getDb().execute<{ id: string; user_id: string; tx_hash: string }>(sql`
    select id, user_id, tx_hash
    from crypto_orders
    where status = 'submitted' and tx_hash is not null
    limit 20
  `);
  let checked = 0;
  for (const row of rows) {
    await confirmHireOrder(row.user_id, row.id, row.tx_hash);
    checked += 1;
  }
  return checked;
}

export async function recordBillingInterest(input: {
  userId: string | null;
  email: string | null;
  token: string | null;
  chain: string | null;
}): Promise<void> {
  await getDb().execute(sql`
    insert into billing_interest (user_id, email, plan_code, token, chain)
    values (${input.userId}, ${input.email}, ${HIRE_PLAN}, ${input.token}, ${input.chain})
  `);
}
