"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/choice";

type Channel = "inapp" | "email" | "telegram";

type Preference = {
  type: string;
  channel: Channel;
  enabled: boolean;
  label: string;
  channelLabel: string;
};

/** One row per event, one switch per channel (D330). */
export function PreferenceToggles({
  items,
  saved,
  error,
}: {
  items: Preference[];
  saved: string;
  error: string;
}) {
  const [message, setMessage] = useState("");

  async function toggle(item: Preference, enabled: boolean) {
    setMessage("");
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preferences: [{ type: item.type, channel: item.channel, enabled }],
      }),
    });
    setMessage(response.ok ? saved : error);
  }

  const groups = new Map<string, Preference[]>();
  for (const item of items) {
    groups.set(item.type, [...(groups.get(item.type) ?? []), item]);
  }

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col border-t border-line">
        {[...groups.values()].map((group) => (
          <li
            key={group[0]!.type}
            className="flex flex-col gap-2 border-b border-line py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <span className="min-w-0 break-words">{group[0]!.label}</span>
            <span className="flex shrink-0 flex-wrap gap-x-6 gap-y-1">
              {group.map((item) => (
                <span
                  key={item.channel}
                  className="inline-flex items-center gap-2"
                >
                  <Switch
                    label={`${item.label}: ${item.channelLabel}`}
                    defaultChecked={item.enabled}
                    onChange={(event) => toggle(item, event.target.checked)}
                  />
                  <span aria-hidden="true" className="t-body-s text-fg-muted">
                    {item.channelLabel}
                  </span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p role="status" className="t-body-s min-h-6 pt-3 text-fg-muted">
        {message}
      </p>
    </div>
  );
}
