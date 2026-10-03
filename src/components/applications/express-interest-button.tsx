"use client";

import { Handshake } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon, useToast } from "@/components/ui";

/** 5C: shortlists the application and opens contacts in one step. */
export function ExpressInterestButton({
  applicationId,
  label,
  error,
}: {
  applicationId: string;
  label: string;
  processing?: string;
  error: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const response = await fetch(
      `/api/applications/${applicationId}/express-interest`,
      { method: "POST" },
    ).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      toast.show(error, "danger");
      return;
    }
    router.refresh();
  }

  return (
    <Button
      loading={busy}
      onClick={() => run()}
      icon={<Icon icon={Handshake} size={16} />}
    >
      {label}
    </Button>
  );
}
