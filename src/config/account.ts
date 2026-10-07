/** D331: soft account type chosen at registration; permissions stay with D13. */
export const ACCOUNT_TYPES = ["candidate", "employer"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
