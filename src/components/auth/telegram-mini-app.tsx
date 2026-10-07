"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  needsPartitionedSession,
  readTelegramInitData,
  telegramWebApp,
  TG_INIT_DATA_KEY,
  TG_INIT_HASH_KEY,
} from "./mini-app-open";

function storedHash(): string | null {
  try {
    return sessionStorage.getItem(TG_INIT_HASH_KEY);
  } catch {
    return null;
  }
}

function storedInit(): string | null {
  try {
    return sessionStorage.getItem(TG_INIT_DATA_KEY);
  } catch {
    return null;
  }
}

function rememberHash(hash: string) {
  if (!hash.includes("tgWebAppData")) return;
  try {
    sessionStorage.setItem(TG_INIT_HASH_KEY, hash);
  } catch {
    // Private mode may refuse storage; the live hash may still work.
  }
}

function rememberInit(initData: string) {
  if (!initData) return;
  try {
    sessionStorage.setItem(TG_INIT_DATA_KEY, initData);
  } catch {
    // Ignore.
  }
}

function forgetStored() {
  try {
    sessionStorage.removeItem(TG_INIT_HASH_KEY);
    sessionStorage.removeItem(TG_INIT_DATA_KEY);
  } catch {
    // Ignore.
  }
}

/**
 * Inside Telegram the page is opened with signed data about the person in the
 * URL fragment. We check that signature on the server and open the session,
 * so a Mini App visitor is already signed in (D259). On phones the official
 * bridge script may be the only way initData appears (D324).
 */
export function TelegramMiniApp({ locale }: { locale: AppLocale }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    rememberHash(window.location.hash);
    try {
      telegramWebApp(window)?.ready?.();
    } catch {
      // Older clients may not implement ready().
    }

    async function signIn(initData: string) {
      const response = await fetch("/api/auth/telegram/miniapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          initData,
          locale,
          framed: needsPartitionedSession(window),
        }),
      });
      if (cancelled || !response.ok) return;
      forgetStored();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      router.refresh();
    }

    function tick() {
      if (cancelled) return;
      rememberHash(window.location.hash);
      const injected = telegramWebApp(window)?.initData;
      if (injected) rememberInit(injected);
      const initData = readTelegramInitData({
        hash: window.location.hash,
        injected,
        storedHash: storedHash(),
        storedInit: storedInit(),
      });
      if (initData) {
        void signIn(initData).catch(() => {
          // Offline or refused: the person can still sign in by hand.
        });
        return;
      }
      tries += 1;
      // ~5s: phone bridge + telegram-web-app.js can arrive after first paint.
      if (tries < 50) window.setTimeout(tick, 100);
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  return null;
}
