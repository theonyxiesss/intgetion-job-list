"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Outcome = "ok" | "invalid_link" | "taken" | "failed";

/** Confirms the added email only on a click (D231). */
export function ConfirmEmail({ token }: { token: string }) {
  const t = useTranslations("settings.email");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const response = await fetch("/api/me/email/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      reason?: Outcome;
    } | null;
    setOutcome(body?.ok ? "ok" : (body?.reason ?? "failed"));
    setBusy(false);
  }

  if (outcome) {
    return (
      <div className="flex flex-col gap-3">
        <p role={outcome === "ok" ? "status" : "alert"}>
          {outcome === "ok" ? t("confirmed") : t(`errors.${outcome}`)}
        </p>
        <Link href="/settings/account" className="underline">
          {t("toAccount")}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p>{t("confirmText")}</p>
      <div>
        <Button onClick={confirm} disabled={busy}>
          {t("confirmButton")}
        </Button>
      </div>
    </div>
  );
}
