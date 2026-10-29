"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UGC_DECLINE_REASONS } from "@/config/ugc";

/** Turn an application down with a reason from the short list (U3б). */
export function RejectApplication({ inviteId }: { inviteId: string }) {
  const t = useTranslations("ugc");
  const [reason, setReason] = useState<string>(UGC_DECLINE_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function run() {
    setBusy(true);
    setNote("");
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reject", inviteId, reason }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setNote(t("error"));
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="t-body-s">
        <span className="sr-only">{t("rejectReasonLabel")}</span>
        <select
          className="rounded-md border border-line bg-bg px-2 py-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {UGC_DECLINE_REASONS.map((code) => (
            <option key={code} value={code}>
              {t(`declineReason.${code}`)}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void run()}
      >
        {t("rejectApplication")}
      </Button>
      {note ? (
        <p role="alert" className="t-body-s text-danger">
          {note}
        </p>
      ) : null}
    </div>
  );
}
