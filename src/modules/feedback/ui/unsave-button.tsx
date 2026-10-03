"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UnsaveButton({
  jobId,
  label,
  error,
}: {
  jobId: string;
  label: string;
  error: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function unsave() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/jobs/${jobId}/save`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        className="min-h-11 rounded border px-4 py-2"
        onClick={unsave}
        disabled={busy}
      >
        {label}
      </button>
      {failed && (
        <span role="alert" className="text-sm">
          {error}
        </span>
      )}
    </span>
  );
}
