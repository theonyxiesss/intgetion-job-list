/**
 * Getting out of Telegram into the person's own browser (D318).
 *
 * `window.open` after an `await` is not a click anymore, so the browser
 * drops it. The window has to be reserved in the click handler. A phone
 * webview still keeps that window inside Telegram, and there the one-time
 * address is shown as text so it can be copied into the real browser.
 */

export type ReservedPopup = {
  location: { replace: (url: string) => void };
  close: () => void;
  closed: boolean;
  opener: unknown;
};

export function reserveBrowserPopup(
  open: (url: string, target: string) => ReservedPopup | null,
): ReservedPopup | null {
  const popup = open("about:blank", "_blank");
  if (!popup) return null;
  try {
    popup.opener = null;
  } catch {
    // The browser already sealed the new window.
  }
  return popup;
}

/**
 * Phone webviews, and the Telegram apps themselves, do not leave the app
 * through `window.open`. Telegram Web on a computer is an ordinary browser
 * frame and is not matched here.
 */
export function handoffNeedsCopy(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Telegram/i.test(userAgent);
}

export function isOwnHandoffUrl(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === origin && parsed.pathname.endsWith("/auth/callback")
    );
  } catch {
    return false;
  }
}

type TelegramWebApp = {
  initData?: string;
  openLink?: (url: string) => void;
};

/** Present only when the Telegram client injected it. We never load the script. */
export function telegramWebApp(win: Window): TelegramWebApp | undefined {
  const host = win as Window & { Telegram?: { WebApp?: TelegramWebApp } };
  return host.Telegram?.WebApp;
}

/**
 * Telegram puts the signed payload in the URL fragment. Some clients also
 * keep it on the injected object after the fragment has been wiped.
 */
export function readTelegramInitData(input: {
  hash: string;
  injected?: string;
}): string | null {
  const fromHash = new URLSearchParams(input.hash.replace(/^#/, "")).get(
    "tgWebAppData",
  );
  if (fromHash) return fromHash;
  const injected = input.injected?.trim();
  return injected ? injected : null;
}

export function deliverHandoffUrl(
  url: string,
  delivery: {
    popup: ReservedPopup | null;
    openExternal?: (url: string) => void;
    webView: boolean;
  },
): { reveal: boolean } {
  if (delivery.openExternal) {
    try {
      delivery.popup?.close();
      delivery.openExternal(url);
      return { reveal: false };
    } catch {
      return { reveal: true };
    }
  }
  if (delivery.webView || !delivery.popup || delivery.popup.closed) {
    if (delivery.popup && !delivery.popup.closed) delivery.popup.close();
    return { reveal: true };
  }
  try {
    delivery.popup.location.replace(url);
    return { reveal: false };
  } catch {
    delivery.popup.close();
    return { reveal: true };
  }
}
