import { flags } from "@/config/flags";
import {
  hasMiniAppMarker,
  isFramedRequest,
} from "@/lib/supabase/cookie-options";

/**
 * Whether the Spoki side panel may show (D525, D611): SPOKI_DOCK is on, the
 * page is not inside the Telegram Mini App (it has its own bar and keeps
 * `/chat`), and UI 2.0 is off. With UI 2.0 there is no side panel anywhere:
 * Spoki is the home page and the full `/chat` page (founder, 2026-11-24).
 */
export function dockAllowed(input: {
  dockFlag: boolean;
  uiV2: boolean;
  inMiniApp: boolean;
}): boolean {
  return input.dockFlag && !input.uiV2 && !input.inMiniApp;
}

/**
 * The Spoki panel is on. The layout and the `/chat` page ask the same
 * question, so they never disagree.
 */
export function spokiDockOn(requestHeaders: Headers): boolean {
  return dockAllowed({
    dockFlag: flags.spokiDockEnabled,
    uiV2: flags.uiV2Enabled,
    inMiniApp:
      isFramedRequest(requestHeaders) || hasMiniAppMarker(requestHeaders),
  });
}
