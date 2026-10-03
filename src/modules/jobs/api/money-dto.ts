/** Temporary 3B adapter. Replace with src/lib/money.ts once 4A-lib is in master (D60). */
export type JobMoneyDto = {
  amountMinor: string;
  currency: string;
  period: string;
  basis: string;
};

export function toJobMoneyDto(input: {
  amountMinor: bigint | null;
  currency: string | null;
  period: string | null;
  basis: string | null;
}): JobMoneyDto | null {
  if (
    input.amountMinor === null ||
    !input.currency ||
    !input.period ||
    !input.basis
  )
    return null;
  return {
    amountMinor: input.amountMinor.toString(),
    currency: input.currency.trim(),
    period: input.period,
    basis: input.basis,
  };
}
