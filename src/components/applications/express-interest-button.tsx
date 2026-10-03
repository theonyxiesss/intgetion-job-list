"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExpressInterestButton({
  applicationId,
  label,
  processing,
  error,
}: {
  applicationId: string;
  label: string;
  processing: string;
  error: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    setBusy(true);
    setFailed(false);
    const response = await fetch(
      `/api/applications/${applicationId}/express-interest`,
      { method: "POST" },
    );
    setBusy(false);
    if (!response.ok) {
      setFailed(true);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="inline-flex min-h-11 items-center border border-current px-3"
        disabled={busy}
        onClick={() => run()}
      >
        {busy ? processing : label}
      </button>
      {failed ? <p>{error}</p> : null}
    </div>
  );
}
