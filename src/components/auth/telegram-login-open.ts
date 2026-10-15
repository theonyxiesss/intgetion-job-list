import type { ReservedPopup } from "./mini-app-open";

/**
 * Opens the bot without leaving this tab (D426). `window.open` after `await`
 * is blocked on a phone, and `location.assign` replaces the page that is
 * waiting for the tap. A reserved window gets the link; otherwise the page
 * shows a real link for a second tap.
 */
export function handoffTelegramLogin(
  popup: ReservedPopup | null,
  url: string,
): "popup" | "link" {
  if (!popup || popup.closed) return "link";
  try {
    popup.location.replace(url);
    return "popup";
  } catch {
    try {
      popup.close();
    } catch {
      // The browser already closed it.
    }
    return "link";
  }
}
