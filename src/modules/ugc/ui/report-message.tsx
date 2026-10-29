"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UGC_REPORT_REASONS } from "@/config/ugc";

/** A complaint about the other side's message. A moderator decides (D574). */
export function ReportMessage({ messageId }: { messageId: string }) {
  const t = useTranslations("ugc");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(UGC_REPORT_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setNote(null);
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "roomReport", messageId, reason }),
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) {
      setNote({ ok: true, text: t("roomReported") });
      setOpen(false);
      return;
    }
    const data = (await response?.json().catch(() => null)) as {
      error?: { code?: string };
    } | null;
    setNote({
      ok: false,
      text:
        data?.error?.code === "ALREADY_REPORTED"
          ? t("roomReported")
          : t("error"),
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-1">
        {note ? (
          <p
            role={note.ok ? "status" : "alert"}
            className="t-body-s text-fg-muted"
          >
            {note.text}
          </p>
        ) : (
          <button
            type="button"
            className="t-body-s text-fg-muted underline underline-offset-4"
            onClick={() => setOpen(true)}
          >
            {t("roomReport")}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="t-body-s">
        <span className="sr-only">{t("roomReportReason")}</span>
        <select
          className="rounded-md border border-line bg-bg px-2 py-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {UGC_REPORT_REASONS.map((code) => (
            <option key={code} value={code}>
              {t(`reportReason.${code}`)}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void send()}
      >
        {t("roomReportSend")}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        {t("roomReportCancel")}
      </Button>
      {note && !note.ok ? (
        <p role="alert" className="t-body-s text-danger">
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
