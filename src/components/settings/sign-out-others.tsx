"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Ends the account's sessions on every other device. */
export function SignOutOthers() {
  const t = useTranslations("settings.v2");
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const response = await fetch("/api/me/sessions", {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);
    toast.show(
      response?.ok ? t("signOutOthersDone") : t("signOutOthersFailed"),
      response?.ok ? "info" : "danger",
    );
  }
  return (
    <section
      aria-labelledby="sessions-title"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h2 id="sessions-title" className="t-h3">
          {t("sessions")}
        </h2>
        <p className="t-body-s text-fg-muted">{t("sessionsText")}</p>
      </div>
      <Button variant="secondary" loading={busy} onClick={run}>
        {t("signOutOthers")}
      </Button>
    </section>
  );
}
