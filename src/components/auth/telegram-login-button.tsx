"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  waiting,
  failed,
  children,
}: {
  locale: AppLocale;
  label: string;
  waiting: string;
  failed: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const routerRef = useRef(router);
  const [phase, setPhase] = useState<"idle" | "waiting" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const afterClick = attempt > 0;
    async function tick() {
      const response = await fetch("/api/auth/telegram/pending", {
        method: "POST",
      });
      if (cancelled) return;
      // 202 is still `ok` in fetch. It means the bot has not confirmed yet.
      if (response.status === 202) {
        setPhase("waiting");
        timer = window.setTimeout(() => void tick(), 2000);
        return;
      }
      if (response.ok) {
        routerRef.current.replace("/");
        routerRef.current.refresh();
        return;
      }
      if (afterClick) setPhase("failed");
    }
    void tick().catch(() => {
      if (!cancelled && afterClick) setPhase("failed");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt]);

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
      {children}
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
