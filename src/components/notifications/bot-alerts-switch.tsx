"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Switch } from "@/components/ui/choice";

/** Notification types about new jobs that the bot switch covers. */
export const NEW_JOB_TYPES = [
  "search.alert",
  "matches.digest",
  "company.new_jobs",
] as const;

/**
 * One switch for "new jobs in the Telegram bot": it writes the telegram
 * channel of every new-job type at once. Without a linked Telegram the switch
 * is off and points to the account settings where it is linked.
 */
export function BotAlertsSwitch({
  linked,
  enabled,
  labels,
}: {
  linked: boolean;
  enabled: boolean;
  labels: {
    title: string;
    text: string;
    link: string;
    saved: string;
    error: string;
  };
}) {
  const [on, setOn] = useState(linked && enabled);
  const [message, setMessage] = useState("");

  async function toggle(next: boolean) {
    setOn(next);
    setMessage("");
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preferences: NEW_JOB_TYPES.map((type) => ({
          type,
          channel: "telegram",
          enabled: next,
        })),
      }),
    });
    if (!response.ok) setOn(!next);
    setMessage(response.ok ? labels.saved : labels.error);
  }

  return (
    <section className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
      <div className="flex flex-col gap-1">
        <p className="t-h3">{labels.title}</p>
        <p className="text-fg-muted">{labels.text}</p>
        {linked ? null : (
          <Link href="/settings/account" className="text-accent underline">
            {labels.link}
          </Link>
        )}
        {message ? (
          <p role="status" className="text-fg-muted">
            {message}
          </p>
        ) : null}
      </div>
      <Switch
        label={labels.title}
        checked={on}
        disabled={!linked}
        onChange={(event) => toggle(event.target.checked)}
      />
    </section>
  );
}
