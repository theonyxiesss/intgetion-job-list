"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
      <Button
        type="button"
        variant="secondary"
        onClick={unsave}
        disabled={busy}
      >
        {label}
      </Button>
      {failed && (
        <span role="alert" className="text-sm">
          {error}
        </span>
      )}
    </span>
  );
}
