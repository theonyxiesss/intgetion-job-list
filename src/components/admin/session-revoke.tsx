"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function SessionRevoke({ id, label }: { id: string; label: string }) {
  const [pending, setPending] = useState(false);

  async function revoke() {
    setPending(true);
    await fetch("/api/admin-auth/sessions/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    window.location.reload();
  }

  return (
    <Button type="button" variant="danger" disabled={pending} onClick={revoke}>
      {label}
    </Button>
  );
}
