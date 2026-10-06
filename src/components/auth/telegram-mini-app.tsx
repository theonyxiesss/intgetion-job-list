"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  readTelegramInitData,
  TELEGRAM_INIT_STORAGE_KEY,
  telegramWebApp,
} from "./mini-app-open";

/**
 * Inside Telegram the page is opened with signed data about the person in the
 * URL fragment. We check that signature on the server and open the session,
 * so a Mini App visitor is already signed in (D259). Nothing is loaded from
 * Telegram: the fragment is read directly, no outside script.
 */
export function TelegramMiniApp({ locale }: { locale: AppLocale }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const started = Date.now();

    const signIn = (initData: string) => {
      void (async () => {
        try {
          const response = await fetch("/api/auth/telegram/miniapp", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ initData, locale }),
          });
          if (cancelled || !response.ok) return;
          // The signed data is a credential: keep it out of history and logs.
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
          router.refresh();
        } catch {
          // Offline or refused: the person can still sign in by hand.
        }
      })();
    };

    const attempt = () => {
      if (cancelled) return;
      let stored: string | null = null;
      try {
        stored = window.sessionStorage.getItem(TELEGRAM_INIT_STORAGE_KEY);
      } catch {
        // Private mode: the fragment and the injected object still count.
      }
      const initData = readTelegramInitData({
        hash: window.location.hash,
        injected: telegramWebApp(window)?.initData,
        stored,
      });
      if (initData) {
        signIn(initData);
        return;
      }
      // The client sometimes writes the payload just after the page loads.
      if (Date.now() - started < 2000) {
        timer = window.setTimeout(attempt, 100);
      }
    };
    attempt();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [locale, router]);

  return null;
}
