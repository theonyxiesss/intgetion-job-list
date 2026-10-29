"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { UGC_DISPUTE_REASONS, UGC_LIMITS } from "@/config/ugc";

type Dispute = {
  status: "open" | "in_review" | "resolved";
  reason: string;
  outcome: string | null;
  side: "company" | "creator";
};

/** A problem on the order: raise it, and see where support is with it (U7). */
export function DisputePanel({
  inviteId,
  dispute,
  canOpen,
}: {
  inviteId: string;
  dispute: Dispute | null;
  canOpen: boolean;
}) {
  const t = useTranslations("ugc");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const response = await fetch("/api/ugc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "disputeOpen",
        inviteId,
        reason: String(form.get("reason") ?? ""),
        note: String(form.get("note") ?? ""),
      }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      setError(
        data?.error?.code === "CONTACTS_IN_TEXT" ||
          data?.error?.code === "VALIDATION_ERROR"
          ? t("roomContacts")
          : t("error"),
      );
      return;
    }
    window.location.reload();
  }

  if (!dispute && !canOpen) return null;
  return (
    <section
      aria-labelledby="dispute-title"
      className="flex flex-col gap-3 rounded-lg border border-line p-4"
    >
      <h2 id="dispute-title" className="t-h4">
        {t("disputeTitle")}
      </h2>
      {dispute ? (
        <div className="t-body-s flex flex-col gap-1">
          <p role="status" className="font-medium">
            {t(`disputeStatus.${dispute.status}`)}
            {dispute.outcome
              ? ` · ${t(`disputeOutcome.${dispute.outcome}`)}`
              : ""}
          </p>
          <p className="text-fg-muted">
            {t(`disputeWho.${dispute.side}`)} ·{" "}
            {t(`disputeReason.${dispute.reason}`)}
          </p>
        </div>
      ) : null}
      {canOpen && !open ? (
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={() => setOpen(true)}
        >
          {t("disputeOpen")}
        </Button>
      ) : null}
      {canOpen && open ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={onSubmit}
          aria-busy={busy}
        >
          <Field label={t("disputeReasonLabel")}>
            <select
              name="reason"
              className="rounded-md border border-line bg-bg px-2 py-2"
              defaultValue={UGC_DISPUTE_REASONS[0]}
            >
              {UGC_DISPUTE_REASONS.map((code) => (
                <option key={code} value={code}>
                  {t(`disputeReason.${code}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("disputeNoteLabel")}>
            <Textarea
              name="note"
              rows={3}
              maxLength={UGC_LIMITS.disputeNoteMax}
            />
          </Field>
          <p className="t-body-s text-fg-muted">{t("disputeHint")}</p>
          <div className="flex gap-3">
            <Button type="submit" variant="strong" disabled={busy}>
              {t("disputeSend")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {t("roomReportCancel")}
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
