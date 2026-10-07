"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  AUTH_EMAIL_CONFIRMED_CHANNEL,
  AUTH_EMAIL_CONFIRMED_KEY,
} from "./email-confirmed-notify";

/**
 * While the person waits on "check your email", finish sign-in when another
 * tab or device confirms the link (D326 / D328).
 */
export function CheckEmailWatch() {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;

    function goHome() {
      if (!stopped) {
        router.replace("/");
        router.refresh();
      }
    }

    async function poll() {
      const me = await fetch("/api/me").catch(() => null);
      if (me?.ok) {
        goHome();
        return;
      }
      const wait = await fetch("/api/auth/email-wait", {
        method: "POST",
      }).catch(() => null);
      if (wait?.status === 200) {
        const body = (await wait.json().catch(() => null)) as {
          ok?: boolean;
        } | null;
        if (body?.ok) goHome();
      }
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
      // Poll remains.
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
