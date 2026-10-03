"use client";
/* eslint-disable intgetion/no-hardcoded-jsx-text -- dev-only showcase (D142) */

import { useState } from "react";
import { Button, ConfirmCard, Dialog, useToast } from "@/components/ui";

export function InteractiveDemo() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open dialog
        </Button>
        <Button variant="secondary" onClick={() => toast.show("Job saved.")}>
          Info toast
        </Button>
        <Button
          variant="danger"
          onClick={() => toast.show("Could not save the job.", "danger")}
        >
          Error toast
        </Button>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Report this job"
        closeLabel="Close"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Send report</Button>
          </>
        }
      >
        <p className="text-fg-muted">
          Tell us what is wrong. One report per job.
        </p>
      </Dialog>
      <ConfirmCard
        title="Apply to Senior Backend Engineer?"
        confirmLabel="Apply"
        cancelLabel="Cancel"
        loading={confirming}
        onConfirm={() => {
          setConfirming(true);
          setTimeout(() => setConfirming(false), 1500);
        }}
        onCancel={() => toast.show("Cancelled.")}
      >
        The company sees your profile without contacts until it expresses
        interest.
      </ConfirmCard>
    </div>
  );
}
