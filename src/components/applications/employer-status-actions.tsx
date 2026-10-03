"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationStatus } from "@/modules/applications/service";

export function EmployerStatusActions({
  applicationId,
  targets,
  text,
}: {
  applicationId: string;
  targets: ApplicationStatus[];
  text: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(to: ApplicationStatus) {
    setBusy(true);
    setFailed(false);
    const response = await fetch(`/api/applications/${applicationId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    });
    setBusy(false);
    if (!response.ok) {
      setFailed(true);
      return;
    }
    router.refresh();
  }

  if (targets.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((to) => (
        <button
          key={to}
          type="button"
          className="inline-flex min-h-11 items-center border border-current px-3"
          disabled={busy}
          onClick={() => run(to)}
        >
          {busy ? text.processing : text[to]}
        </button>
      ))}
      {failed ? <p>{text.error}</p> : null}
    </div>
  );
}
