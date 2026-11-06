/**
 * A question another page hands to Spoki (D601): the home page field. The
 * text never goes into the address; it waits here until the one chat (panel
 * or `/chat`) is ready and asks it. Session storage carries it over a full
 * page load; without storage it lives for this page.
 */
const KEY = "spoki_ask";
const EVENT = "spoki-ask";
let pending: string | null = null;

export function handSpokiAsk(text: string) {
  pending = text;
  try {
    window.sessionStorage.setItem(KEY, text);
  } catch {
    // The question stays in memory for this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The waiting question, once: taking it clears it. */
export function takeSpokiAsk(): string | null {
  let text = pending;
  pending = null;
  try {
    text = window.sessionStorage.getItem(KEY) ?? text;
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Memory only.
  }
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}

export function onSpokiAsk(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Fired when one chat turn ends, answered or stopped. */
export const SPOKI_TURN_DONE = "spoki-turn-done";
