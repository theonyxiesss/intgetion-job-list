/**
 * Price list shown on /pricing (docs/PRICING.md, section 1A).
 * The charge is the same dollars in `plans.price_minor` (D358).
 */
export type PricingAudience = "companies" | "candidates";

export type PricingTier = {
  code: string;
  /** Whole US dollars; null for free. */
  price: number | null;
  /** How the price is counted: once per job or per month. */
  per: "job" | "month" | null;
  /** Yearly price in whole dollars, for subscriptions. */
  yearly?: number;
  recommended?: boolean;
  /** Message keys under pricing.tiers.<code>.points */
  points: readonly string[];
};

export const PRICING: Record<PricingAudience, readonly PricingTier[]> = {
  companies: [
    {
      code: "start",
      price: null,
      per: null,
      points: ["jobs", "catalog", "applications", "digest", "stats"],
    },
    {
      code: "hire",
      price: 79,
      per: "job",
      recommended: true,
      points: ["guarantee", "instant", "promoted", "forecast", "firstFree"],
    },
    {
      code: "team",
      price: 199,
      per: "month",
      yearly: 1990,
      points: ["jobs", "promoted", "team", "api", "channel"],
    },
  ],
  candidates: [
    {
      code: "free",
      price: null,
      per: null,
      points: ["search", "apply", "match", "alerts", "agent"],
    },
    {
      code: "plus",
      price: 5,
      per: "month",
      yearly: 39,
      recommended: true,
      points: ["instant", "agent", "letters", "views", "hidden"],
    },
    {
      code: "pro",
      price: 15,
      per: "month",
      yearly: 119,
      points: ["agent", "interview", "review", "salary", "views"],
    },
  ],
};

/** Things no plan sells (docs/PRICING.md, section 0). */
export const ALWAYS_FREE = [
  "posting",
  "trust",
  "contacts",
  "match",
  "apply",
  "imported",
] as const;

/** Where the free card goes. Posting continues to the job form (D347). */
/** Paid cards open crypto checkout. Start and Free stay free (D358). */
export function planPayHref(paymentsOn: boolean, code: string): string | null {
  if (!paymentsOn) return null;
  if (code === "hire" || code === "team" || code === "plus" || code === "pro") {
    return `/billing/crypto?plan=${code}`;
  }
  return null;
}

export function freePlanHref(
  audience: PricingAudience,
  next?: string,
): string {
  if (audience === "companies" && next === "post") return "/employer/jobs/new";
  if (audience === "companies") return "/for-employers";
  return "/register";
}

export const PRICING_FAQ = [
  "guarantee",
  "cancel",
  "crypto",
  "seen",
  "when",
] as const;
