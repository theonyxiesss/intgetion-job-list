"use client";

import { useState } from "react";
import { Choice } from "@/components/ui/choice";

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
          <Choice
            label={`${item.label} (${item.channelLabel})`}
            defaultChecked={item.enabled}
            onChange={(event) => toggle(item, event.target.checked)}
          />
        </li>
      ))}
      {message ? <li>{message}</li> : null}
    </ul>
  );
}
