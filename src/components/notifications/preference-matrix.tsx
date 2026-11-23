"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/choice";

type Channel = "inapp" | "email" | "telegram";

export type MatrixRow = {
  id: string;
  label: string;
  types: string[];
  /** Switch state per shown channel: on when every type of the row is on. */
  enabled: Partial<Record<Channel, boolean>>;
};

/**
 * v2 (UI_V2) settings mockup: one row per event group, one column per
 * channel. A switch writes the same value for every type in its group.
 */
export function PreferenceMatrix({
  rows,
  channels,
  eventLabel,
  saved,
  error,
}: {
  rows: MatrixRow[];
  channels: { id: Channel; label: string }[];
  eventLabel: string;
  saved: string;
  error: string;
}) {
  const [message, setMessage] = useState("");

  async function toggle(row: MatrixRow, channel: Channel, enabled: boolean) {
    setMessage("");
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preferences: row.types.map((type) => ({ type, channel, enabled })),
      }),
    });
    setMessage(response.ok ? saved : error);
  }

  return (
    <div className="flex flex-col">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-fg-subtle">
            <th scope="col" className="py-2 pr-3 font-normal">
              {eventLabel}
            </th>
            {channels.map((channel) => (
              <th
                key={channel.id}
                scope="col"
                className="w-20 px-1 py-2 text-center font-normal sm:w-24"
              >
                {channel.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0">
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                {row.label}
              </th>
              {channels.map((channel) => (
                <td key={channel.id} className="px-1 py-1 text-center">
                  <Switch
                    label={`${row.label}: ${channel.label}`}
                    defaultChecked={row.enabled[channel.id] ?? false}
                    onChange={(event) =>
                      toggle(row, channel.id, event.target.checked)
                    }
                    className="justify-center"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p role="status" className="min-h-6 pt-3 text-xs text-fg-muted">
        {message}
      </p>
    </div>
  );
}
