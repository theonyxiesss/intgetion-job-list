/**
 * Reconciliation of one brief's money for support (U7, TZ 48 §8). Pure: the
 * sums come from the deposit, payout and refund records. The rule is
 * "paid in = rewards recorded + returned + rest"; a negative rest means the
 * records promise or return more than the company paid in.
 */

export type LedgerState =
  /** More recorded or returned than paid in: look now. */
  | "over"
  /** The brief is still running; the rest may still be offered. */
  | "running"
  /** Closed, but a recorded reward is not paid yet. */
  | "owed"
  /** Closed, everything paid, the rest has not gone back. */
  | "refund_due"
  /** Closed, everything paid, nothing left. */
  | "settled";

export type LedgerInput = {
  status: string;
  depositMinor: bigint;
  accruedMinor: bigint;
  paidMinor: bigint;
  refundMinor: bigint;
};

export type LedgerLine = {
  restMinor: bigint;
  owedMinor: bigint;
  state: LedgerState;
};

export function reconcileLedger(input: LedgerInput): LedgerLine {
  const restMinor = input.depositMinor - input.accruedMinor - input.refundMinor;
  const owedMinor = input.accruedMinor - input.paidMinor;
  let state: LedgerState;
  if (restMinor < BigInt(0) || owedMinor < BigInt(0)) state = "over";
  else if (input.status !== "closed") state = "running";
  else if (owedMinor > BigInt(0)) state = "owed";
  else if (restMinor > BigInt(0)) state = "refund_due";
  else state = "settled";
  return { restMinor, owedMinor, state };
}

const STATE_ORDER: Record<LedgerState, number> = {
  over: 0,
  owed: 1,
  refund_due: 2,
  running: 3,
  settled: 4,
};

/** Lines that need support first: mismatches, then unpaid, then unreturned. */
export function ledgerOrder(a: LedgerState, b: LedgerState): number {
  return STATE_ORDER[a] - STATE_ORDER[b];
}
