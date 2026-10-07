"use client";

import { useEffect } from "react";

export const AUTH_EMAIL_CONFIRMED_CHANNEL = "auth-email-confirmed";
export const AUTH_EMAIL_CONFIRMED_KEY = "auth-email-confirmed";

/**
 * Signals other same-origin tabs (the "check your email" page) that the
 * address was confirmed in this window (D326).
 */
export function EmailConfirmedNotify() {
  useEffect(() => {
    try {
      localStorage.setItem(AUTH_EMAIL_CONFIRMED_KEY, String(Date.now()));
    } catch {
      // Private mode may block storage.
    }
    try {
      const channel = new BroadcastChannel(AUTH_EMAIL_CONFIRMED_CHANNEL);
      channel.postMessage({ ok: true });
      channel.close();
    } catch {
      // Older browsers without BroadcastChannel still get the storage event
      // or the /api/me poll on the waiting tab.
    }
  }, []);
  return null;
}
