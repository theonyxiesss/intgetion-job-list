import { RETURN_PATHS } from "@/components/auth/login-next";
import { planPayHref } from "@/config/pricing";

/**
 * Pages Spoki may put on a card (D359). The model names an action.
 * The path is built here, so a prompt cannot turn the card into an open link.
 */
export const OFFER_ACTIONS = [
  "pay_hire",
  "pay_team",
  "pay_plus",
  "pay_pro",
  "pricing",
  "register",
  "post_job",
] as const;

export type OfferAction = (typeof OFFER_ACTIONS)[number];

const PLAN: Partial<Record<OfferAction, string>> = {
  pay_hire: "hire",
  pay_team: "team",
  pay_plus: "plus",
  pay_pro: "pro",
};

export function isOfferAction(value: unknown): value is OfferAction {
  return (
    typeof value === "string" &&
    (OFFER_ACTIONS as readonly string[]).includes(value)
  );
}

/** Relative path for the card. Null when the step does not apply. */
export function offerPath(
  action: OfferAction,
  signedIn: boolean,
): string | null {
  const plan = PLAN[action];
  if (plan) return planPayHref(true, plan, signedIn);
  if (action === "pricing") return "/pricing";
  if (action === "register") {
    return signedIn ? null : "/register?next=chat";
  }
  if (action === "post_job") {
    return signedIn ? RETURN_PATHS["post-job"] : "/login?next=post-job";
  }
  return null;
}
