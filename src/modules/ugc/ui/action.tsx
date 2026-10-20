"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** One confirmed write. The server checks the person and the row. */
export function UgcAction({
  action,
  label,
  body,
  primary = false,
}: {
  action: string;
  label: string;
  body?: Record<string, unknown>;
  primary?: boolean;
}) {
  const t = useTranslations("ugc");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/ugc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = (await response.json().catch(() => null)) as {
        payload?: string;
        forModel?: string;
        redirect?: string;
        error?: { code?: string };
      } | null;
      if (!response.ok) {
        // An unsent draft blocks taking a brief back (D512).
        setNote(
          data?.error?.code === "UGC_DRAFT_IN_PROGRESS"
            ? t("draftInProgress")
            : t("error"),
        );
        return;
      }
      if (data?.redirect) {
        router.push(data.redirect);
        return;
      }
      if (data?.payload) {
        setNote(`https://t.me/intgetion_bot?start=${data.payload}`);
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant={primary ? "primary" : "secondary"}
        disabled={busy}
        aria-busy={busy}
        onClick={() => void run()}
      >
        {label}
      </Button>
      {note.startsWith("https://") ? (
        <a className="t-body-s break-all underline" href={note}>
          {t("joinReady")}
        </a>
      ) : note ? (
        <p className="t-body-s text-fg-muted" role="alert">
          {note}
        </p>
      ) : null}
    </div>
  );
}
