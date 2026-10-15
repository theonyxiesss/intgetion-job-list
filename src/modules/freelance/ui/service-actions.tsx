"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { FreelanceServiceStatus } from "@/config/freelance";
import { callApi, errorText, type ClientCopy } from "./client-api";

/** Owner buttons for one service: send to moderation, pause, show again. */
export function ServiceActions({
  serviceId,
  status,
  copy,
}: {
  serviceId: string;
  status: FreelanceServiceStatus;
  copy: ClientCopy;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(name: string, url: string, body: unknown) {
    setBusy(name);
    setError(null);
    const result = await callApi(url, body);
    setBusy(null);
    if (!result.ok) {
      setError(errorText(copy, result.code));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <Button
            loading={busy === "submit"}
            onClick={() =>
              run("submit", `/api/freelance/services/${serviceId}/submit`, {})
            }
          >
            {copy.submit}
          </Button>
        ) : null}
        {status === "published" ? (
          <Button
            variant="secondary"
            loading={busy === "pause"}
            onClick={() =>
              run("pause", `/api/freelance/services/${serviceId}/pause`, {
                paused: true,
              })
            }
          >
            {copy.pause}
          </Button>
        ) : null}
        {status === "paused" ? (
          <Button
            variant="secondary"
            loading={busy === "resume"}
            onClick={() =>
              run("resume", `/api/freelance/services/${serviceId}/pause`, {
                paused: false,
              })
            }
          >
            {copy.resume}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
