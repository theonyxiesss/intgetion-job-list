"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  AUTH_EMAIL_CONFIRMED_CHANNEL,
  AUTH_EMAIL_CONFIRMED_KEY,
} from "./email-confirmed-notify";

/**
 * While the person waits on "check your email", refresh this tab when
 * another tab (or phone confirm + later return) establishes a session (D326).
 */
export function CheckEmailWatch() {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;

    function goHome() {
      if (!stopped) router.replace("/");
    }

    async function poll() {
      const response = await fetch("/api/me").catch(() => null);
      if (response?.ok) goHome();
    }

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 3000);

    function onStorage(event: StorageEvent) {
      if (event.key === AUTH_EMAIL_CONFIRMED_KEY) goHome();
    }
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_EMAIL_CONFIRMED_CHANNEL);
      channel.onmessage = () => goHome();
    } catch {
      // Poll + storage remain.
    }

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, [router]);

  return null;
}
