"use client";

import { CirclePause, CirclePlay, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

type Action = "publish" | "pause" | "close" | "extend";

const look: Record<Action, { variant: ButtonVariant; icon: typeof Send }> = {
  publish: { variant: "primary", icon: Send },
  extend: { variant: "primary", icon: CirclePlay },
  pause: { variant: "secondary", icon: CirclePause },
  close: { variant: "danger", icon: XCircle },
};

export function JobActions({
  jobId,
  status,
  text,
}: {
  jobId: string;
  status: string;
  text: Record<Action | "processing" | "error", string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<Action | null>(null);
  const actions: Action[] =
    status === "draft"
      ? ["publish"]
      : status === "published"
        ? ["pause", "close"]
        : status === "paused" || status === "expired"
          ? ["extend", "close"]
          : [];
  async function run(action: Action) {
    setBusy(action);
    try {
      const response = await fetch(`/api/jobs/${jobId}/${action}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(text.error);
      router.refresh();
    } catch {
      toast.show(text.error, "danger");
    } finally {
      setBusy(null);
    }
  }
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action}
          variant={look[action].variant}
          loading={busy === action}
          disabled={busy !== null && busy !== action}
          icon={<Icon icon={look[action].icon} size={16} />}
          onClick={() => void run(action)}
        >
          {text[action]}
        </Button>
      ))}
    </div>
  );
}
