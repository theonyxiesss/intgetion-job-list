"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { handoffTelegramLogin } from "./telegram-login-open";
import { reserveBrowserPopup, type ReservedPopup } from "./mini-app-open";

/**
 * Opens the site bot in Telegram. The page stays here and signs in after
 * the person taps the button in the chat (D256). On a phone the window is
 * reserved before the request, so this tab is not replaced (D426).
 */
export function TelegramLoginButton({
  locale,
  label,
  waiting,
  failed,
  openLabel,
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
  /** Shown when the browser would not open Telegram by itself. */
  openLabel: string;
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
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);

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
          setOpenUrl(null);
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
        lock.current = false;
        return;
      }
      if (afterClick) {
        setPhase("failed");
        lock.current = false;
      }
    }
    function wake() {
      if (document.visibilityState === "hidden" || attempt === 0) return;
      window.clearTimeout(timer);
      void tick(true);
    }
    void tick(attempt > 0).catch(() => {
      if (!cancelled && attempt > 0) {
        setPhase("failed");
        lock.current = false;
      }
    });
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pageshow", wake);
    };
  }, [attempt, purpose, router]);

  async function onClick() {
    if (lock.current) return;
    lock.current = true;
    setPhase("waiting");
    setOpenUrl(null);
    const popup = reserveBrowserPopup((url, target) => {
      const opened = window.open(url, target);
      return opened as ReservedPopup | null;
    });
    try {
      const response = await fetch("/api/auth/telegram/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, purpose }),
      });
      if (!response.ok) {
        popup?.close();
        setPhase("failed");
        lock.current = false;
        return;
      }
      const body = (await response.json()) as { url?: string };
      if (!body.url?.startsWith("https://t.me/")) {
        popup?.close();
        setPhase("failed");
        lock.current = false;
        return;
      }
      if (handoffTelegramLogin(popup, body.url) === "link") {
        setOpenUrl(body.url);
      }
      setAttempt((value) => value + 1);
    } catch {
      popup?.close();
      setPhase("failed");
      lock.current = false;
    }
  }

  const classes = buttonClassName ?? buttonClass("secondary", "md", "w-full");

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={classes}
        disabled={phase === "waiting"}
        onClick={() => void onClick()}
      >
        {icon}
        {label}
      </button>
      {openUrl && (
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
        >
          {openLabel}
        </a>
      )}
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
