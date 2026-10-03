"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      <Button type="button" variant="secondary" onClick={run}>
        {label}
      </Button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
