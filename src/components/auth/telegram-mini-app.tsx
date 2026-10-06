"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  isEmbeddedFrame,
  readTelegramInitData,
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
    const initData = readTelegramInitData({
      hash: window.location.hash,
      injected: telegramWebApp(window)?.initData,
    });
    if (!initData) return;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/auth/telegram/miniapp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            initData,
            locale,
            // A phone webview is not a frame. Partitioned cookies are dropped
            // there, so the session has to be a normal first-party cookie.
            framed: isEmbeddedFrame(window),
          }),
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

    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  return null;
}
