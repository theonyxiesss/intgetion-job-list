/**
 * The money of one order as its parties see it (U7, TZ 48 §8). Pure: the rows
 * come from the existing deposit, payout and refund records; nothing here
 * moves money. The company sees the budget it paid in and what came back;
 * the creator sees only what was earned and what was paid.
 */

export type MoneyEventKind = "deposit" | "accrued" | "paid" | "refund";

export type MoneyEvent = {
  kind: MoneyEventKind;
  /** ISO time. */
  at: string;
  amountMinor: string;
};

export type MoneyHistoryInput = {
  side: "company" | "creator";
  /** The confirmed budget of the brief, with the time it was paid in. */
  deposit?: { at: string; amountMinor: string } | null;
  /** What went back to the company when the brief closed. */
  refund?: { at: string; amountMinor: string } | null;
  payout?: {
    amountMinor: string;
    createdAt: Date | null;
    paidAt: Date | null;
  } | null;
};

const ORDER: Record<MoneyEventKind, number> = {
  deposit: 0,
  accrued: 1,
  paid: 2,
  refund: 3,
};

export function buildMoneyHistory(input: MoneyHistoryInput): MoneyEvent[] {
  const events: MoneyEvent[] = [];
  if (input.side === "company" && input.deposit) {
    events.push({ kind: "deposit", ...input.deposit });
  }
  const payout = input.payout;
  if (payout?.createdAt) {
    events.push({
      kind: "accrued",
      at: payout.createdAt.toISOString(),
      amountMinor: payout.amountMinor,
    });
  }
  if (payout?.paidAt) {
    events.push({
      kind: "paid",
      at: payout.paidAt.toISOString(),
      amountMinor: payout.amountMinor,
    });
  }
  if (input.side === "company" && input.refund) {
    events.push({ kind: "refund", ...input.refund });
  }
  return events.sort(
    (a, b) => a.at.localeCompare(b.at) || ORDER[a.kind] - ORDER[b.kind],
  );
}
