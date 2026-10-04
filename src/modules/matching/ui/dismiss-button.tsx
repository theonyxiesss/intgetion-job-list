"use client";

import { ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

export const DISMISS_REASONS = [
  "salary",
  "format",
  "timezone",
  "company",
  "role",
  "other",
] as const;
type DismissReason = (typeof DISMISS_REASONS)[number];

export interface DismissText {
  dismiss: string;
  title: string;
  lead: string;
  reasonLabel: string;
  reasonNone: string;
  confirm: string;
  cancel: string;
  close: string;
  error: string;
  rateLimited: string;
  reasons: Record<DismissReason, string>;
}

/** "Not a fit" on a match card: a reason, then POST …/feedback (6B). */
export function DismissButton({
  jobId,
  jobTitle,
  text,
}: {
  jobId: string;
  jobTitle: string;
  text: DismissText;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState<DismissReason | "none">("none");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/matches/${jobId}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "dismissed",
          ...(reason !== "none" ? { reason } : {}),
        }),
      });
      if (response.status === 429) {
        setError(text.rateLimited);
        return;
      }
      if (!response.ok) throw new Error();
      setOpen(false);
      router.refresh();
    } catch {
      setError(text.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        icon={<Icon icon={ThumbsDown} />}
        aria-label={`${text.dismiss}: ${jobTitle}`}
        title={text.dismiss}
        onClick={() => setOpen(true)}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={text.title}
        closeLabel={text.close}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {text.cancel}
            </Button>
            <Button loading={busy} onClick={submit}>
              {text.confirm}
            </Button>
          </>
        }
      >
        <fieldset className="flex flex-col gap-1">
          <legend className="t-body-s mb-3 text-fg-muted">{text.lead}</legend>
          <span className="t-label mb-1 text-fg-muted">{text.reasonLabel}</span>
          {(["none", ...DISMISS_REASONS] as const).map((value) => (
            <Choice
              key={value}
              type="radio"
              name={`dismiss-reason-${jobId}`}
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              label={value === "none" ? text.reasonNone : text.reasons[value]}
            />
          ))}
        </fieldset>
        {error ? (
          <p role="alert" className="t-body-s mt-3 text-danger">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
