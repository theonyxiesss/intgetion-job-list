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

/** Key the official Mini App script uses for the copy that survives a reload. */
export const TELEGRAM_INIT_STORAGE_KEY = "__telegram__initParams";

function looksLikeInitData(query: string): boolean {
  const params = new URLSearchParams(query);
  return Boolean(
    params.get("hash") && params.get("auth_date") && params.get("user"),
  );
}

/** The official script stores `{ tgWebAppData }` under TELEGRAM_INIT_STORAGE_KEY. */
export function readStoredTelegramInitData(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { tgWebAppData?: unknown };
    if (typeof parsed.tgWebAppData !== "string") return null;
    const value = parsed.tgWebAppData.trim();
    return value ? value : null;
  } catch {
    return null;
  }
}

/**
 * Telegram puts the signed payload in the URL fragment under `tgWebAppData`.
 * Some clients put the raw init-data string in the fragment, and some leave
 * a copy on `Telegram.WebApp.initData` or in sessionStorage after the
 * fragment is gone (D319).
 */
export function readTelegramInitData(input: {
  hash: string;
  injected?: string;
  stored?: string | null;
}): string | null {
  const query = input.hash.replace(/^#/, "");
  const fromHash = new URLSearchParams(query).get("tgWebAppData");
  if (fromHash) return fromHash;
  if (query && looksLikeInitData(query)) return query;
  const injected = input.injected?.trim();
  if (injected) return injected;
  return readStoredTelegramInitData(input.stored ?? null);
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
