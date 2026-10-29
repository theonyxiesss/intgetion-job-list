"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { callApi, errorText, type ClientCopy } from "./client-api";

/** Owner actions for an open task or one of its pending proposals. */
export function TaskManagementActions({
  taskId,
  proposalId,
  copy,
}: {
  taskId?: string;
  proposalId?: string;
  copy: ClientCopy;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "close" | "accept" | "decline") {
    setBusy(true);
    setError(null);
    type ActionResult = {
      order?: { id: string };
      task?: { id: string };
      proposal?: { id: string };
    };
    const result = taskId
      ? await callApi<ActionResult>(`/api/freelance/tasks/${taskId}`, { action: "close" })
      : await callApi<ActionResult>(
          `/api/freelance/proposals/${proposalId}`,
          { action },
        );
    setBusy(false);
    if (!result.ok) {
      setError(errorText(copy, result.code));
      return;
    }
    if (action === "accept" && "order" in result.data && result.data.order?.id) {
      router.push(`/freelance/orders/${result.data.order.id}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {taskId ? (
        <Button variant="secondary" disabled={busy} onClick={() => act("close")}>{copy.closeTask}</Button>
      ) : (
        <>
          <Button variant="secondary" disabled={busy} onClick={() => act("accept")}>{copy.acceptProposal}</Button>
          <Button variant="secondary" disabled={busy} onClick={() => act("decline")}>{copy.declineProposal}</Button>
        </>
      )}
      {error ? <p role="alert" className="w-full text-sm text-danger">{error}</p> : null}
    </div>
  );
}
