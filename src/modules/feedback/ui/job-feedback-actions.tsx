"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type HideReasonKey =
  "salary" | "format" | "timezone" | "company" | "role" | "other";

export type ReportReasonKey =
  | "scam"
  | "spam"
  | "fake_company"
  | "discrimination"
  | "wrong_info"
  | "inappropriate"
  | "other";

export interface JobFeedbackText {
  save: string;
  saved: string;
  unsave: string;
  saveError: string;
  hide: string;
  hideTitle: string;
  hideScopeJob: string;
  hideScopeCompany: string;
  reasonLabel: string;
  reasonNone: string;
  confirm: string;
  cancel: string;
  hideError: string;
  report: string;
  reportTitle: string;
  detailsLabel: string;
  reportSuccess: string;
  alreadyReported: string;
  rateLimited: string;
  reportError: string;
  hideReasons: Record<HideReasonKey, string>;
  reportReasons: Record<ReportReasonKey, string>;
}

type Dialog = "hide" | "report" | null;

export function JobFeedbackActions({
  jobId,
  initialSaved,
  text,
}: {
  jobId: string;
  initialSaved: boolean;
  text: JobFeedbackText;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [hideError, setHideError] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [hideScope, setHideScope] = useState<"job" | "company">("job");
  const [hideReason, setHideReason] = useState<HideReasonKey | "none">("none");
  const [reportReason, setReportReason] = useState<ReportReasonKey>("spam");
  const [details, setDetails] = useState("");

  async function toggleSave() {
    setBusy(true);
    setSaveError(false);
    try {
      const response = await fetch(`/api/jobs/${jobId}/save`, {
        method: saved ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error();
      setSaved(!saved);
      router.refresh();
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitHide() {
    setBusy(true);
    setHideError(false);
    try {
      const response = await fetch(`/api/jobs/${jobId}/hide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope: hideScope,
          ...(hideScope === "job" && hideReason !== "none"
            ? { reason: hideReason }
            : {}),
        }),
      });
      if (!response.ok) throw new Error();
      setDialog(null);
      router.refresh();
    } catch {
      setHideError(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    setBusy(true);
    setReportMessage("");
    try {
      const response = await fetch(`/api/jobs/${jobId}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          ...(details.trim() ? { details: details.trim() } : {}),
        }),
      });
      if (response.status === 201) {
        setReportMessage(text.reportSuccess);
        setDialog(null);
      } else if (response.status === 409) {
        setReportMessage(text.alreadyReported);
        setDialog(null);
      } else if (response.status === 429) {
        setReportMessage(text.rateLimited);
        setDialog(null);
      } else {
        setReportMessage(text.reportError);
      }
    } catch {
      setReportMessage(text.reportError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="min-h-11 rounded border px-4 py-2"
          onClick={toggleSave}
          disabled={busy}
        >
          {saved ? text.saved : text.save}
        </button>
        <button
          type="button"
          className="min-h-11 rounded border px-4 py-2"
          onClick={() => setDialog("hide")}
        >
          {text.hide}
        </button>
        <button
          type="button"
          className="min-h-11 rounded border px-4 py-2"
          onClick={() => setDialog("report")}
        >
          {text.report}
        </button>
      </div>
      {saveError && <p role="alert">{text.saveError}</p>}
      {reportMessage && <p role="status">{reportMessage}</p>}
      {dialog === "hide" && (
        <form
          className="flex flex-col gap-3 rounded border p-4"
          aria-label={text.hideTitle}
          onSubmit={(event) => {
            event.preventDefault();
            void submitHide();
          }}
        >
          <h3>{text.hideTitle}</h3>
          <fieldset className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="hide-scope"
                checked={hideScope === "job"}
                onChange={() => setHideScope("job")}
              />
              {text.hideScopeJob}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="hide-scope"
                checked={hideScope === "company"}
                onChange={() => setHideScope("company")}
              />
              {text.hideScopeCompany}
            </label>
          </fieldset>
          {hideScope === "job" && (
            <label className="flex flex-col gap-1">
              {text.reasonLabel}
              <select
                value={hideReason}
                onChange={(event) =>
                  setHideReason(event.target.value as HideReasonKey | "none")
                }
              >
                <option value="none">{text.reasonNone}</option>
                {Object.entries(text.hideReasons).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded bg-accent px-4 py-2 text-accent-fg"
            >
              {text.confirm}
            </button>
            <button
              type="button"
              className="min-h-11 rounded border px-4 py-2"
              onClick={() => setDialog(null)}
            >
              {text.cancel}
            </button>
          </div>
          {hideError && <p role="alert">{text.hideError}</p>}
        </form>
      )}
      {dialog === "report" && (
        <form
          className="flex flex-col gap-3 rounded border p-4"
          aria-label={text.reportTitle}
          onSubmit={(event) => {
            event.preventDefault();
            void submitReport();
          }}
        >
          <h3>{text.reportTitle}</h3>
          <label className="flex flex-col gap-1">
            {text.reasonLabel}
            <select
              value={reportReason}
              onChange={(event) =>
                setReportReason(event.target.value as ReportReasonKey)
              }
            >
              {Object.entries(text.reportReasons).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            {text.detailsLabel}
            <textarea
              value={details}
              maxLength={1000}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded bg-accent px-4 py-2 text-accent-fg"
            >
              {text.confirm}
            </button>
            <button
              type="button"
              className="min-h-11 rounded border px-4 py-2"
              onClick={() => setDialog(null)}
            >
              {text.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
