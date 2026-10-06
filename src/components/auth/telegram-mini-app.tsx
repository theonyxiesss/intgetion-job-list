"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  needsPartitionedSession,
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
    let cancelled = false;
    let tries = 0;

    async function signIn(initData: string) {
      const response = await fetch("/api/auth/telegram/miniapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          initData,
          locale,
          // Only web.telegram.org needs Partitioned cookies (D315, D321).
          framed: needsPartitionedSession(window),
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
    }

    function tick() {
      if (cancelled) return;
      const initData = readTelegramInitData({
        hash: window.location.hash,
        injected: telegramWebApp(window)?.initData,
      });
      if (initData) {
        void signIn(initData).catch(() => {
          // Offline or refused: the person can still sign in by hand.
        });
        return;
      }
      // Phone clients sometimes inject the payload a moment after load (D321).
      tries += 1;
      if (tries < 20) window.setTimeout(tick, 100);
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  return null;
}
