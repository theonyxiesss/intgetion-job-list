"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { Dialog } from "@/components/ui/dialog";

const reasons = [
  "salary",
  "format",
  "timezone",
  "company",
  "role",
  "other",
] as const;

export type DismissReason = (typeof reasons)[number];

export interface DismissText {
  dismiss: string;
  title: string;
  confirm: string;
  cancel: string;
  close: string;
  error: string;
  reasons: Record<DismissReason, string>;
}

export function DismissButton({
  jobId,
  text,
}: {
  jobId: string;
  text: DismissText;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DismissReason>("role");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function confirm() {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(`/api/matches/${jobId}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "dismissed", reason }),
      });
      if (!response.ok) throw new Error();
      setOpen(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() => {
          setError(false);
          setOpen(true);
        }}
      >
        {text.dismiss}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={text.title}
        closeLabel={text.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {text.cancel}
            </Button>
            <Button disabled={busy} onClick={() => void confirm()}>
              {text.confirm}
            </Button>
          </>
        }
      >
        <fieldset className="flex flex-col gap-1">
          {reasons.map((value) => (
            <Choice
              key={value}
              type="radio"
              name={`dismiss-${jobId}`}
              label={text.reasons[value]}
              checked={reason === value}
              onChange={() => setReason(value)}
            />
          ))}
        </fieldset>
        {error ? (
          <p className="t-body-s mt-3 text-danger">{text.error}</p>
        ) : null}
      </Dialog>
    </>
  );
}
