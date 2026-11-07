/**
 * A question another page hands to Spoki (D601): the home page field. The
 * text never goes into the address; it waits here until the one chat (panel
 * or `/chat`) is ready and asks it. Session storage carries it over a full
 * page load; without storage it lives for this page.
 */
const KEY = "spoki_ask";
const FILE_KEY = "spoki_ask_file";
const EVENT = "spoki-ask";
let pending: string | null = null;

/** A file read by `/api/bot/attachment` that goes with the question. */
export type HandedFile = { name: string; text: string };
let pendingFile: HandedFile | null = null;

export function handSpokiAsk(text: string, file?: HandedFile) {
  pending = text;
  pendingFile = file ?? null;
  try {
    window.sessionStorage.setItem(KEY, text);
    if (file) window.sessionStorage.setItem(FILE_KEY, JSON.stringify(file));
    else window.sessionStorage.removeItem(FILE_KEY);
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

/** The file handed with the waiting question, once. */
export function takeSpokiFile(): HandedFile | null {
  let file = pendingFile;
  pendingFile = null;
  try {
    const stored = window.sessionStorage.getItem(FILE_KEY);
    window.sessionStorage.removeItem(FILE_KEY);
    if (stored) file = JSON.parse(stored) as HandedFile;
  } catch {
    // Memory only.
  }
  return file?.name && file.text ? file : null;
}

export function onSpokiAsk(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Fired when one chat turn ends, answered or stopped. */
export const SPOKI_TURN_DONE = "spoki-turn-done";

/** The chat home's menu: whether the chat has left its empty screen. */
export const SPOKI_CONVERSATION = "spoki-conversation";
/** The chat asks the chat home to open its profile window. */
export const SPOKI_PROFILE = "spoki-profile";
/** The chat home's menu asks the chat to open its file picker. */
export const SPOKI_ATTACH = "spoki-attach";
