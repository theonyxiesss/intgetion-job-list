import type { VerifyResult } from "./verify-transfer";

export type OrderStatus =
  | "open"
  | "submitted"
  | "confirmed"
  | "expired"
  | "frozen"
  | "failed";

/** What the client is allowed to see. The browser never sends this. */
export type ClientBillingStatus =
  | "awaiting_payment"
  | "checking"
  | "paid"
  | "underpaid"
  | "expired"
  | "failed"
  | "frozen";

export function clientStatus(input: {
  status: OrderStatus;
  reason: string | null;
  expiresAt: Date;
  now: Date;
}): ClientBillingStatus {
  if (input.status === "confirmed") return "paid";
  if (input.status === "frozen") return "frozen";
  if (input.status === "failed") return "failed";
  if (input.status === "expired") return "expired";
  if (input.status === "open" && input.expiresAt <= input.now) return "expired";
  if (input.status === "open") return "awaiting_payment";
  if (input.reason === "underpaid") return "underpaid";
  return "checking";
}

export function settlement(verify: VerifyResult): {
  status: OrderStatus;
  reason: string | null;
  grant: boolean;
} {
  if (verify.ok) return { status: "confirmed", reason: null, grant: true };
  if (verify.reason === "confirmations" || verify.reason === "missing") {
    return { status: "submitted", reason: null, grant: false };
  }
  if (verify.reason === "underpaid") {
    return { status: "submitted", reason: "underpaid", grant: false };
  }
  if (verify.reason === "sanctioned") {
    return { status: "frozen", reason: "sanctioned", grant: false };
  }
  return { status: "failed", reason: verify.reason, grant: false };
}

export const HIRE_PLAN = "company_hire";
export const HIRE_PRICE_MINOR = BigInt(7900);
export const HIRE_DAYS = 30;

export function formatTokenAmount(units: string): string {
  const scale = BigInt(1000000);
  const value = BigInt(units);
  const whole = value / scale;
  const frac = value % scale;
  if (frac === BigInt(0)) return whole.toString();
  const digits = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole}.${digits}`;
}

export function hireGrants() {
  return {
    promotedDays: 7,
    instantAlerts: true,
    guaranteeApplications: 10,
  } as const;
}
