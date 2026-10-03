"use client";

import { useState } from "react";

type Preference = {
  type: string;
  channel: "inapp" | "email";
  enabled: boolean;
  label: string;
  channelLabel: string;
};

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

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={`${item.type}:${item.channel}`}
          className="flex items-center gap-3"
        >
          <label className="inline-flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              defaultChecked={item.enabled}
              aria-label={`${item.label} ${item.channelLabel}`}
              onChange={(event) => toggle(item, event.target.checked)}
            />
            <span>{`${item.label} (${item.channelLabel})`}</span>
          </label>
        </li>
      ))}
      {message ? <li>{message}</li> : null}
    </ul>
  );
}
