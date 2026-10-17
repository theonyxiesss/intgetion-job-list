"use client";

import { useTranslations } from "next-intl";

/** Spoki account actions that confirm on a card (D472). */
export const ACCOUNT_CARD_TOOLS = [
  "unsave_job",
  "withdraw_application",
  "save_search",
  "delete_saved_search",
  "set_search_alert",
  "follow_company",
  "unfollow_company",
  "set_notification",
  "set_profile_hidden",
  "set_morning_briefs",
  "create_reminder",
  "cancel_reminder",
] as const;

export function isAccountCardTool(tool: string): boolean {
  return (ACCOUNT_CARD_TOOLS as readonly string[]).includes(tool);
}

const CHANNELS = new Set(["inapp", "email", "telegram"]);

function flag(args: Record<string, unknown>, key: string): string {
  return args[key] === true ? "true" : "false";
}

/**
 * What the account card will do. `preview` is the target's name from the
 * server (a job title, a search name); it is shown as plain text.
 */
export function AccountCardText({
  tool,
  args,
  preview,
}: {
  tool: string;
  args: unknown;
  preview?: string;
}) {
  const t = useTranslations("chat.account");
  const types = useTranslations("notifications.types");
  const channels = useTranslations("notificationSettings");
  const a = (args ?? {}) as Record<string, unknown>;
  const name = preview ?? "";
  if (tool === "set_notification") {
    const channel = typeof a.channel === "string" ? a.channel : "";
    const title = /^[a-zA-Z]+$/.test(name)
      ? types(`${name}.inapp.title`)
      : name;
    return t("set_notification", {
      on: flag(a, "enabled"),
      name: title,
      channel: CHANNELS.has(channel) ? channels(channel) : channel,
    });
  }
  if (tool === "set_search_alert") {
    return t("set_search_alert", { on: flag(a, "alert"), name });
  }
  if (tool === "set_profile_hidden") {
    return t("set_profile_hidden", { on: flag(a, "hidden") });
  }
  if (tool === "set_morning_briefs") {
    return t("set_morning_briefs", { on: flag(a, "enabled") });
  }
  return t(tool as (typeof ACCOUNT_CARD_TOOLS)[number], { name });
}
