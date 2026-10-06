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

/**
 * Partitioned cookies are only for a real cross-site frame on
 * web.telegram.org (D315). Phone apps sometimes wrap the page in an
 * iframe inside their own webview — that is not Telegram Web, and
 * Partitioned cookies do not stick there (D321).
 */
export function needsPartitionedSession(win: {
  parent: unknown;
  document?: { referrer?: string };
  location?: { ancestorOrigins?: ArrayLike<string> };
}): boolean {
  let nested = false;
  try {
    nested = win.parent != null && win !== win.parent;
  } catch {
    nested = true;
  }
  if (!nested) return false;
  return hostIsTelegramWeb(win);
}

function hostIsTelegramWeb(win: {
  document?: { referrer?: string };
  location?: { ancestorOrigins?: ArrayLike<string> };
}): boolean {
  const ancestors = win.location?.ancestorOrigins;
  if (ancestors && ancestors.length > 0) {
    for (let i = 0; i < ancestors.length; i++) {
      if (hostnameIsTelegramWeb(ancestors[i]!)) return true;
    }
  }
  const referrer = win.document?.referrer;
  return referrer ? hostnameIsTelegramWeb(referrer) : false;
}

function hostnameIsTelegramWeb(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "web.telegram.org" || host.endsWith(".telegram.org");
  } catch {
    return /(?:^|\.)telegram\.org$/i.test(value);
  }
}

/** Present only when the Telegram client injected it. We never load the script. */
export function telegramWebApp(win: Window): TelegramWebApp | undefined {
  const host = win as Window & { Telegram?: { WebApp?: TelegramWebApp } };
  return host.Telegram?.WebApp;
}

/**
 * Telegram's own hash parser (from telegram-web-app.js): a path may sit
 * before `?`, and only the query after it carries `tgWebAppData`. Our first
 * version treated `#/en?tgWebAppData=…` as one key and returned null — that
 * is the shape some phone clients send (D321).
 */
export function readTelegramInitData(input: {
  hash: string;
  injected?: string;
}): string | null {
  const fromHash = tgWebAppDataFromHash(input.hash);
  if (fromHash) return fromHash;
  const injected = input.injected?.trim();
  return injected ? injected : null;
}

function tgWebAppDataFromHash(hash: string): string | null {
  let body = hash.replace(/^#/, "");
  if (!body) return null;
  const queryAt = body.indexOf("?");
  if (queryAt >= 0) body = body.slice(queryAt + 1);
  if (!body.includes("=")) return null;
  try {
    return new URLSearchParams(body).get("tgWebAppData");
  } catch {
    return null;
  }
}

/** @deprecated use needsPartitionedSession — kept for a short transition. */
export function isEmbeddedFrame(win: { parent: unknown }): boolean {
  try {
    return win.parent != null && win !== win.parent;
  } catch {
    return true;
  }
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
