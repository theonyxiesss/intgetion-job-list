"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Switch } from "@/components/ui/choice";
import {
  newJobChannelPreferences,
  type NewJobChannel,
} from "./new-job-types";

/**
 * One switch for every new-job type on one channel (D329, D349).
 * Without a usable destination the switch stays off and points at account
 * settings. When the agent is off, the switch is grey and does not save.
 */
export function BotAlertsSwitch({
  channel,
  linked,
  enabled,
  locked = false,
  labels,
}: {
  channel: NewJobChannel;
  linked: boolean;
  enabled: boolean;
  locked?: boolean;
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
    if (!linked || locked) return;
    setOn(next);
    setMessage("");
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preferences: newJobChannelPreferences(channel, next),
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
        disabled={!linked || locked}
        onChange={(event) => toggle(event.target.checked)}
      />
    </section>
  );
}
