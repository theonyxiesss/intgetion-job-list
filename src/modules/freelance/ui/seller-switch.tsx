"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/choice";
import { useRouter } from "@/i18n/navigation";
import { callApi, errorText, type ClientCopy } from "./client-api";

/** «Беру заказы»: shows or hides all of a person's services (28.2). */
export function SellerSwitch({
  accepting,
  copy,
}: {
  accepting: boolean;
  copy: ClientCopy;
}) {
  const router = useRouter();
  const [on, setOn] = useState(accepting);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    const result = await callApi("/api/freelance/seller", { accepting: next });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(copy, result.code));
      return;
    }
    setOn(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Switch
          label={copy.acceptingLabel ?? ""}
          checked={on}
          disabled={busy}
          aria-busy={busy || undefined}
          onChange={(event) => toggle(event.target.checked)}
        />
        <span>
          {copy.acceptingLabel}
          <span className="t-body-s ml-2 text-fg-muted">
            {on ? copy.acceptingOn : copy.acceptingOff}
          </span>
        </span>
      </div>
      {error ? (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
