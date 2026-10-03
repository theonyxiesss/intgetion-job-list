"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/ui";
import type { ApplicationStatus } from "@/modules/applications/service";

/** Status buttons of an application (5B); «rejected» is the danger one. */
export function EmployerStatusActions({
  applicationId,
  targets,
  text,
}: {
  applicationId: string;
  targets: ApplicationStatus[];
  text: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<ApplicationStatus | null>(null);

  async function run(to: ApplicationStatus) {
    setBusy(to);
    const response = await fetch(`/api/applications/${applicationId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    }).catch(() => null);
    setBusy(null);
    if (!response?.ok) {
      toast.show(text.error ?? "", "danger");
      return;
    }
    router.refresh();
  }

  if (targets.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {targets.map((to) => (
        <Button
          key={to}
          variant={to === "rejected" ? "danger" : "secondary"}
          loading={busy === to}
          disabled={busy !== null && busy !== to}
          onClick={() => run(to)}
        >
          {text[to]}
        </Button>
      ))}
    </div>
  );
}
