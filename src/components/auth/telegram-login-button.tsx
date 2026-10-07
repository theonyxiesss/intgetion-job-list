"use client";

import { useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/**
 * Opens the site bot in Telegram. The page stays here and signs in after
 * the person taps the button in the chat (D256). No phone field.
 */
export function TelegramLoginButton({
  locale,
  label,
  waiting,
  failed,
  taken,
  icon,
  children,
  purpose = "signin",
  buttonClassName,
}: {
  locale: AppLocale;
  label: string;
  waiting: string;
  failed: string;
  /** Shown when this Telegram already belongs to another account. */
  taken?: string;
  /** Brand mark shown before the label. */
  icon?: ReactNode;
  /** Extra line under the button, rendered on the server so its links stay real. */
  children?: ReactNode;
  /** `link` attaches Telegram to the signed-in account instead of signing in. */
  purpose?: "signin" | "link";
  buttonClassName?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "waiting" | "failed" | "taken">(
    "idle",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const pollPath =
      purpose === "link"
        ? "/api/auth/telegram/link"
        : "/api/auth/telegram/pending";
    async function tick(afterClick: boolean) {
      const response = await fetch(pollPath, { method: "POST" });
      if (cancelled) return;
      if (response.ok) {
        if (purpose === "link") {
          setPhase("idle");
          router.refresh();
          return;
        }
        router.replace("/");
        router.refresh();
        return;
      }
      if (response.status === 202) {
        setPhase("waiting");
        timer = window.setTimeout(() => void tick(true), 2000);
        return;
      }
      if (response.status === 409 && purpose === "link") {
        setPhase("taken");
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
  }, [attempt, purpose, router]);

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
        className={buttonClassName ?? buttonClass("secondary", "md", "w-full")}
        onClick={() => void onClick()}
      >
        {icon}
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
      {phase === "taken" && (
        <p className="t-caption text-danger" role="alert">
          {taken ?? failed}
        </p>
      )}
    </div>
  );
}
