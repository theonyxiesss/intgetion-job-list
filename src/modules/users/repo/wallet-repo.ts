import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/** The account wallet (D518): one proven address per account and per address. */

export type WalletRow = {
  user_id: string;
  address: string | null;
  chain_id: number | null;
  verified_at: string | null;
  pending_address: string | null;
  pending_chain_id: number | null;
  pending_message: string | null;
  pending_expires_at: string | null;
};

const COLUMNS = sql`user_id, address, chain_id, verified_at::text,
  pending_address, pending_chain_id, pending_message,
  pending_expires_at::text`;

export async function findWallet(userId: string): Promise<WalletRow | null> {
  const rows = await getDb().execute<WalletRow>(sql`
    select ${COLUMNS} from public.user_wallets where user_id = ${userId}
  `);
  return rows[0] ?? null;
}

/** The account that holds this proven address, if any. */
export async function ownerOfAddress(address: string): Promise<string | null> {
  const rows = await getDb().execute<{ user_id: string }>(sql`
    select user_id from public.user_wallets where address = ${address}
  `);
  return rows[0]?.user_id ?? null;
}

export async function savePending(input: {
  userId: string;
  address: string;
  chainId: number;
  message: string;
  expiresAt: Date;
}): Promise<void> {
  await getDb().execute(sql`
    insert into public.user_wallets
      (user_id, pending_address, pending_chain_id, pending_message, pending_expires_at)
    values (${input.userId}, ${input.address}, ${input.chainId}, ${input.message},
            ${input.expiresAt.toISOString()})
    on conflict (user_id) do update set
      pending_address = excluded.pending_address,
      pending_chain_id = excluded.pending_chain_id,
      pending_message = excluded.pending_message,
      pending_expires_at = excluded.pending_expires_at,
      updated_at = now()
  `);
}

/**
 * The signed address becomes the account address; the pending one is
 * cleared. Only the exact message, before it expires. A unique violation
 * means the address went to another account meanwhile.
 */
export async function confirmPending(input: {
  userId: string;
  message: string;
  signature: string;
}): Promise<WalletRow | null> {
  const rows = await getDb().execute<WalletRow>(sql`
    update public.user_wallets set
      address = pending_address,
      chain_id = pending_chain_id,
      signed_message = pending_message,
      signature = ${input.signature},
      verified_at = now(),
      pending_address = null,
      pending_chain_id = null,
      pending_message = null,
      pending_expires_at = null,
      updated_at = now()
    where user_id = ${input.userId}
      and pending_message = ${input.message}
      and pending_expires_at > now()
    returning ${COLUMNS}
  `);
  return rows[0] ?? null;
}

/** Disconnect: the address and its proof go; payments keep their own copy. */
export async function clearWallet(userId: string): Promise<string | null> {
  const rows = await getDb().execute<{ previous: string | null }>(sql`
    update public.user_wallets w set
      address = null,
      chain_id = null,
      signed_message = null,
      signature = null,
      verified_at = null,
      pending_address = null,
      pending_chain_id = null,
      pending_message = null,
      pending_expires_at = null,
      updated_at = now()
    from (select address as previous from public.user_wallets
          where user_id = ${userId} for update) old
    where w.user_id = ${userId}
    returning old.previous
  `);
  return rows[0]?.previous ?? null;
}
