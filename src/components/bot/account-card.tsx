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
  "propose_job_update",
  "set_job_status",
  "set_service_status",
] as const;

export function isAccountCardTool(tool: string): boolean {
  return (ACCOUNT_CARD_TOOLS as readonly string[]).includes(tool);
}

const CHANNELS = new Set(["inapp", "email", "telegram"]);

/** Vacancy fields Spoki may change, in card order (D498). */
const JOB_FIELDS = [
  "title",
  "description",
  "employmentType",
  "workFormat",
  "location",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "salaryPeriod",
  "salaryBasis",
] as const;
const JOB_STATUS_ACTIONS = new Set(["publish", "pause", "resume", "close"]);

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
  const jobs = useTranslations("jobs");
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
  if (tool === "set_job_status") {
    const action = typeof a.action === "string" ? a.action : "";
    return t("set_job_status", {
      action: JOB_STATUS_ACTIONS.has(action) ? action : "other",
      name,
    });
  }
  if (tool === "set_service_status") {
    return t("set_service_status", {
      action: a.action === "resume" ? "resume" : "pause",
      name,
    });
  }
  if (tool === "propose_job_update") {
    const changes = JOB_FIELDS.filter((key) => typeof a[key] === "string")
      .map((key) => {
        const raw = String(a[key]);
        const value = key.startsWith("salaryM")
          ? String(Number(raw) / 100)
          : key === "description"
            ? `${raw.slice(0, 80)}${raw.length > 80 ? "…" : ""}`
            : jobs.has(raw)
              ? jobs(raw)
              : raw;
        return `${t(`jobFields.${key}`)}: ${value}`;
      })
      .join("; ");
    return t("propose_job_update", { name, changes });
  }
  if (tool === "set_morning_briefs") {
    return t("set_morning_briefs", { on: flag(a, "enabled") });
  }
  return t(tool as (typeof ACCOUNT_CARD_TOOLS)[number], { name });
}

/**
 * The apply card (D475): the job and the letter Spoki wrote for the
 * candidate, shown as plain text before they confirm.
 */
export function ApplyCardText({
  args,
  preview,
  noteLabel,
  fallback,
}: {
  args: unknown;
  preview?: string;
  noteLabel: string;
  fallback: string;
}) {
  const note = (args as { coverNote?: unknown } | null)?.coverNote;
  return (
    <div className="flex flex-col gap-2">
      {preview ? <p className="font-medium text-fg">{preview}</p> : null}
      {typeof note === "string" && note.trim() ? (
        <>
          <p className="t-label">{noteLabel}</p>
          <p className="border-l-2 border-line pl-3 whitespace-pre-line text-fg">
            {note}
          </p>
        </>
      ) : null}
      <p>{fallback}</p>
    </div>
  );
}
