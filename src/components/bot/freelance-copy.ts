/** Tools whose card is a freelance step (28.8, D460). */
export const FREELANCE_CARD_TOOLS = [
  "propose_freelancer_mode",
  "propose_service",
  "propose_service_update",
  "send_service_request",
  "send_task_proposal",
  "cancel_request",
  "respond_to_request",
  "start_order",
  "mark_delivered",
  "review_delivery",
  "propose_review",
  "report_freelance",
] as const;

/**
 * Card copy, `chatFreelance` in the messages. The chat page passes it in so
 * it does not ship with every page's client messages (LCP, D462).
 */
export type FreelanceCardCopy = Record<string, unknown>;

/** `a.b` lookup with `{name}` placeholders; a missing key reads as empty. */
export function cardText(
  copy: FreelanceCardCopy,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  let value: unknown = copy;
  for (const part of key.split(".")) {
    value =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof value !== "string") return "";
  return value.replace(/\{(\w+)\}/g, (all, name: string) =>
    name in vars ? String(vars[name]) : all,
  );
}
