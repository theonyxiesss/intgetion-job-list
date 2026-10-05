"use client";

import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/**
 * Opens the site bot in Telegram. The page stays here and signs in after
 * the person taps the button in the chat (D219). No phone field.
 */
export function TelegramLoginButton({
  locale,
  label,
  terms,
  waiting,
  failed,
}: {
  locale: AppLocale;
  label: string;
  terms: string;
  waiting: string;
  failed: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "waiting" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    async function tick(afterClick: boolean) {
      const response = await fetch("/api/auth/telegram/pending", {
        method: "POST",
      });
      if (cancelled) return;
      if (response.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      if (response.status === 202) {
        setPhase("waiting");
        timer = window.setTimeout(() => void tick(true), 2000);
        return;
      }
      if (afterClick) setPhase("failed");
    }
    void tick(attempt > 0).catch(() => {
      if (!cancelled && attempt > 0) setPhase("failed");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt, router]);

  async function onClick() {
    setPhase("waiting");
    const response = await fetch("/api/auth/telegram/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (!response.ok) {
      setPhase("failed");
      return;
    }
    const body = (await response.json()) as { url?: string };
    if (!body.url?.startsWith("https://t.me/")) {
      setPhase("failed");
      return;
    }
    const opened = window.open(body.url, "_blank");
    if (opened) opened.opener = null;
    else window.location.assign(body.url);
    setAttempt((value) => value + 1);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={buttonClass("secondary", "md", "w-full")}
        onClick={() => void onClick()}
      >
        {label}
      </button>
      <p className="t-caption text-fg-muted">{terms}</p>
      {phase === "waiting" && (
        <p className="t-caption text-fg-muted" role="status">
          {waiting}
        </p>
      )}
      {phase === "failed" && (
        <p className="t-caption text-danger" role="alert">
          {failed}
        </p>
      )}
    </div>
  );
}
