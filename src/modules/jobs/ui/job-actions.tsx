"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "publish" | "pause" | "close" | "extend";
export function JobActions({
  jobId,
  status,
  text,
}: {
  jobId: string;
  status: string;
  text: Record<Action | "processing" | "error", string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actions: Action[] =
    status === "draft"
      ? ["publish"]
      : status === "published"
        ? ["pause", "close"]
        : status === "paused" || status === "expired"
          ? ["extend", "close"]
          : [];
  async function run(action: Action) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/jobs/${jobId}/${action}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(text.error);
      router.refresh();
    } catch {
      setError(text.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          className="rounded-md border border-line-strong px-4 py-2 disabled:opacity-60"
          disabled={busy}
          key={action}
          onClick={() => void run(action)}
          type="button"
        >
          {busy ? text.processing : text[action]}
        </button>
      ))}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
