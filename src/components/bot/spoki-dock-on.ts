import { flags } from "@/config/flags";
import {
  hasMiniAppMarker,
  isFramedRequest,
} from "@/lib/supabase/cookie-options";

/**
 * The Spoki panel is on (D525): SPOKI_DOCK=true and not inside the Telegram
 * Mini App, which has its own bar and keeps the `/chat` page. The layout and
 * the `/chat` page ask the same question, so they never disagree.
 */
export function spokiDockOn(requestHeaders: Headers): boolean {
  if (!flags.spokiDockEnabled) return false;
  return !(isFramedRequest(requestHeaders) || hasMiniAppMarker(requestHeaders));
}
