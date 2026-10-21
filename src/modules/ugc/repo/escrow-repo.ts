import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { UgcSubmissionStatus } from "@/config/ugc";

/** Queries for the UGC campaign wallet (D466): deposits, paid rewards, refunds. */

export type DepositRow = {
  id: string;
  campaign_id: string;
  payer_user_id: string | null;
  chain: string;
  token: string;
  token_contract: string;
  recipient: string;
  payer_address: string;
  amount_minor: string;
  token_amount: string;
  status: "open" | "submitted" | "confirmed" | "failed" | "frozen";
  reason: string | null;
  tx_hash: string | null;
  expires_at: string;
  created_at: string;
};

const COLUMNS = sql`
  id, campaign_id, payer_user_id, chain, token, token_contract, recipient,
  payer_address, amount_minor::text, token_amount::text, status, reason,
  tx_hash, expires_at::text, created_at::text
`;

export async function findDeposit(id: string): Promise<DepositRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await getDb().execute<DepositRow>(sql`
    select ${COLUMNS} from public.ugc_deposits where id = ${id}
  `);
  return rows[0] ?? null;
}

/** The confirmed deposit of a brief first, else its newest try. */
export async function latestDeposit(
  campaignId: string,
): Promise<DepositRow | null> {
  const rows = await getDb().execute<DepositRow>(sql`
    select ${COLUMNS} from public.ugc_deposits
    where campaign_id = ${campaignId}
    order by (status = 'confirmed') desc, created_at desc
    limit 1
  `);
  return rows[0] ?? null;
}

export async function insertDeposit(input: {
  campaignId: string;
  payerUserId: string;
  chain: string;
  token: string;
  tokenContract: string;
  recipient: string;
  payerAddress: string;
  amountMinor: bigint;
  tokenAmount: bigint;
  expiresAt: Date;
}): Promise<DepositRow> {
  const rows = await getDb().execute<DepositRow>(sql`
    insert into public.ugc_deposits (
      campaign_id, payer_user_id, chain, token, token_contract, recipient,
      payer_address, amount_minor, token_amount, expires_at
    ) values (
      ${input.campaignId}, ${input.payerUserId}, ${input.chain}, ${input.token},
      ${input.tokenContract}, ${input.recipient}, ${input.payerAddress},
      ${input.amountMinor.toString()}, ${input.tokenAmount.toString()},
      ${input.expiresAt.toISOString()}
    )
    returning ${COLUMNS}
  `);
  const row = rows[0];
  if (!row) throw new Error("ugc_deposits insert returned nothing");
  return row;
}

/** A check that did not confirm: submitted, failed or frozen. */
export async function markDeposit(
  id: string,
  status: "submitted" | "failed" | "frozen",
  reason: string | null,
  txHash: string,
): Promise<void> {
  await getDb().execute(sql`
    update public.ugc_deposits
    set status = ${status}, reason = ${reason}, tx_hash = ${txHash}, updated_at = now()
    where id = ${id} and status <> 'confirmed'
  `);
}

/**
 * Confirms one deposit. The partial unique indexes refuse a hash that already
 * paid and a second paid deposit of the same brief; that error is the caller's.
 */
export async function confirmDeposit(
  id: string,
  txHash: string,
): Promise<boolean> {
  const rows = await getDb().execute<{ id: string }>(sql`
    update public.ugc_deposits
    set status = 'confirmed', reason = null, tx_hash = ${txHash},
        confirmed_at = now(), updated_at = now()
    where id = ${id} and status <> 'confirmed'
    returning id
  `);
  return rows.length > 0;
}

/** Deposits the cron looks at again: still waiting on the network. */
export async function submittedDeposits(limit: number): Promise<DepositRow[]> {
  return getDb().execute<DepositRow>(sql`
    select ${COLUMNS} from public.ugc_deposits
    where status = 'submitted' and tx_hash is not null
    order by created_at
    limit ${limit}
  `);
}

/** True when this transaction already counts anywhere in the wallet. */
export async function txUsed(chain: string, txHash: string): Promise<boolean> {
  const rows = await getDb().execute<{ used: boolean }>(sql`
    select (
      exists (select 1 from public.ugc_payouts
              where chain = ${chain} and tx_hash = ${txHash})
      or exists (select 1 from public.ugc_refunds
                 where chain = ${chain} and tx_hash = ${txHash})
      or exists (select 1 from public.ugc_deposits
                 where chain = ${chain} and tx_hash = ${txHash}
                   and status = 'confirmed')
    ) as used
  `);
  return Boolean(rows[0]?.used);
}

export type PayoutTxRow = {
  id: string;
  status: "owed" | "paid";
  amount_minor: string;
  created_at: string;
  campaign_id: string;
  creator_user_id: string;
};

export async function payoutForTx(
  payoutId: string,
): Promise<PayoutTxRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(payoutId)) return null;
  const rows = await getDb().execute<PayoutTxRow>(sql`
    select p.id, p.status, p.amount_minor::text, p.created_at::text,
           i.campaign_id, i.creator_user_id
    from public.ugc_payouts p
    join public.ugc_invites i on i.id = p.invite_id
    where p.id = ${payoutId}
  `);
  return rows[0] ?? null;
}

/** Marks an owed reward paid with its checked transaction. */
export async function markPayoutPaidByTx(input: {
  payoutId: string;
  adminId: string;
  chain: string;
  token: string;
  recipient: string;
  txHash: string;
}): Promise<boolean> {
  const rows = await getDb().execute<{ id: string }>(sql`
    update public.ugc_payouts
    set status = 'paid', paid_at = now(), paid_by = ${input.adminId},
        chain = ${input.chain}, token = ${input.token},
        recipient = ${input.recipient}, tx_hash = ${input.txHash},
        updated_at = now()
    where id = ${input.payoutId} and status = 'owed'
    returning id
  `);
  return rows.length > 0;
}

/** Every recorded reward of a brief, owed or paid. */
export async function rewardsOfCampaign(campaignId: string): Promise<bigint[]> {
  const rows = await getDb().execute<{ amount_minor: string }>(sql`
    select p.amount_minor::text
    from public.ugc_payouts p
    join public.ugc_invites i on i.id = p.invite_id
    where i.campaign_id = ${campaignId}
  `);
  return rows.map((row) => BigInt(row.amount_minor));
}

export async function submissionStatuses(
  campaignId: string,
): Promise<UgcSubmissionStatus[]> {
  const rows = await getDb().execute<{ status: UgcSubmissionStatus }>(sql`
    select s.status
    from public.ugc_submissions s
    join public.ugc_invites i on i.id = s.invite_id
    where i.campaign_id = ${campaignId}
  `);
  return rows.map((row) => row.status);
}

export type RefundRow = {
  id: string;
  campaign_id: string;
  amount_minor: string;
  chain: string;
  token: string;
  recipient: string;
  tx_hash: string;
  created_at: string;
};

export async function findRefund(
  campaignId: string,
): Promise<RefundRow | null> {
  const rows = await getDb().execute<RefundRow>(sql`
    select id, campaign_id, amount_minor::text, chain, token, recipient,
           tx_hash, created_at::text
    from public.ugc_refunds where campaign_id = ${campaignId}
  `);
  return rows[0] ?? null;
}

export async function insertRefund(input: {
  campaignId: string;
  depositId: string;
  amountMinor: bigint;
  chain: string;
  token: string;
  recipient: string;
  txHash: string;
  adminId: string;
}): Promise<RefundRow> {
  const rows = await getDb().execute<RefundRow>(sql`
    insert into public.ugc_refunds (
      campaign_id, deposit_id, amount_minor, chain, token, recipient,
      tx_hash, refunded_by
    ) values (
      ${input.campaignId}, ${input.depositId}, ${input.amountMinor.toString()},
      ${input.chain}, ${input.token}, ${input.recipient}, ${input.txHash},
      ${input.adminId}
    )
    returning id, campaign_id, amount_minor::text, chain, token, recipient,
              tx_hash, created_at::text
  `);
  const row = rows[0];
  if (!row) throw new Error("ugc_refunds insert returned nothing");
  return row;
}

/** Closed briefs with a paid budget and no refund yet, for the admin. */
export async function closedWithDeposit(): Promise<
  { campaign_id: string; product_name: string }[]
> {
  return getDb().execute<{ campaign_id: string; product_name: string }>(sql`
    select c.id as campaign_id, c.product_name
    from public.ugc_campaigns c
    join public.ugc_deposits d
      on d.campaign_id = c.id and d.status = 'confirmed'
    where c.status = 'closed'
      and not exists (select 1 from public.ugc_refunds r where r.campaign_id = c.id)
    order by c.updated_at desc
    limit 100
  `);
}

/**
 * Rewards still owed to this creator from a brief with a paid-in budget:
 * they go out from the campaign wallet to the creator's account address at
 * the moment they are paid, so that address must not change before (D518).
 */
export async function owedWalletRewards(creatorId: string): Promise<number> {
  const rows = await getDb().execute<{ n: number }>(sql`
    select count(*)::int as n
    from public.ugc_payouts p
    join public.ugc_invites i on i.id = p.invite_id
    where i.creator_user_id = ${creatorId}
      and p.status = 'owed'
      and exists (
        select 1 from public.ugc_deposits d
        where d.campaign_id = i.campaign_id and d.status = 'confirmed'
      )
  `);
  return rows[0]?.n ?? 0;
}
