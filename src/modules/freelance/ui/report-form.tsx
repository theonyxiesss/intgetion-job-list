"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { callApi, errorText, type ClientCopy } from "./client-api";

const REASONS = ["scam", "spam", "wrong_info", "inappropriate", "other"];

/**
 * A complaint about a service or an order (28.9). The other side never
 * sees who sent it. Three open complaints hold the service for a moderator.
 */
export function ReportForm({
  kind,
  id,
  copy,
}: {
  kind: "services" | "orders";
  id: string;
  copy: ClientCopy;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function send() {
    setBusy(true);
    setMessage("");
    const result = await callApi(`/api/freelance/${kind}/${id}/report`, {
      reason,
      ...(details.trim() ? { details: details.trim() } : {}),
    });
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      setMessage(copy.report_sent ?? "");
      return;
    }
    setMessage(errorText(copy, result.code));
  }

  return (
    <div className="flex flex-col gap-2">
      {!open && (
        <button
          type="button"
          className="t-body-s self-start text-fg-muted underline underline-offset-4"
          onClick={() => setOpen(true)}
        >
          {copy.report_open}
        </button>
      )}
      {open && (
        <form
          className="flex flex-col gap-3 rounded-lg border border-line p-4"
          aria-label={copy.report_title}
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <h3 className="t-h3">{copy.report_title}</h3>
          <label className="flex flex-col gap-1">
            <span className="t-label">{copy.report_reason}</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-11 rounded-md border border-line-strong bg-bg px-3"
            >
              {REASONS.map((value) => (
                <option key={value} value={value}>
                  {copy[`report_reason_${value}`] ?? value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="t-label">{copy.report_details}</span>
            <textarea
              value={details}
              maxLength={1000}
              rows={3}
              onChange={(event) => setDetails(event.target.value)}
              className="rounded-md border border-line-strong bg-bg px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy || undefined}
              className={buttonClass("primary")}
            >
              {copy.report_send}
            </button>
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={() => setOpen(false)}
            >
              {copy.report_cancel}
            </button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className="t-body-s">
          {message}
        </p>
      )}
    </div>
  );
}
