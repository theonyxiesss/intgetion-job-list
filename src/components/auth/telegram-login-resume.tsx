"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { telegramWaitPurpose } from "@/lib/telegram-login-wait";

/**
 * Finishes bot sign-in on whatever page is open when the person comes back
 * from Telegram (D426). The login button's own timer is frozen while the
 * phone app is in front.
 */
export function TelegramLoginResume() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    async function tick() {
      const purpose = telegramWaitPurpose(document.cookie);
      if (!purpose || cancelled) return;
      const path =
        purpose === "link"
          ? "/api/auth/telegram/link"
          : "/api/auth/telegram/pending";
      const response = await fetch(path, { method: "POST" }).catch(() => null);
      if (cancelled || !response) return;
      if (response.ok) {
        router.refresh();
        return;
      }
      if (response.status === 202) {
        timer = window.setTimeout(() => void tick(), 2000);
      }
    }

    function wake() {
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(timer);
      void tick();
    }

    wake();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pageshow", wake);
    };
  }, [router]);

  return null;
}
