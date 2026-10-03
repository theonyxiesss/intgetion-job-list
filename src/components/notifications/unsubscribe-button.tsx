"use client";

import { useState } from "react";

export function UnsubscribeButton({
  token,
  label,
  done,
}: {
  token: string;
  label: string;
  done: string;
}) {
  const [message, setMessage] = useState("");

  async function run() {
    const response = await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (response.ok) setMessage(done);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="inline-flex min-h-11 items-center border border-current px-3"
        onClick={run}
      >
        {label}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
