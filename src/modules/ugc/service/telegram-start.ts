import { siteUrl } from "@/lib/supabase/env";
import { sendTelegramLinks } from "@/modules/auth/service";
import { startPayloadRoute, ugcTokenFromStart } from "./start-payload";

const TEXT =
  "This link opens a UGC video brief on the site. Sign in there. The price is recorded. Nothing is charged.";

function startPayload(text: string): string | null {
  const match = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/.exec(text.trim());
  if (!match) return null;
  return match[1] ?? "";
}

/**
 * `/start ugc_<token>` before the login greeting (27.8). Other payloads
 * return false so that greeting still runs. The reply does not contain the token.
 */
export async function handleUgcTelegramStart(
  token: string,
  raw: unknown,
): Promise<boolean> {
  const message = (
    raw as { message?: { text?: string; chat?: { id?: number } } }
  ).message;
  if (!message?.text || typeof message.chat?.id !== "number") return false;
  const payload = startPayload(message.text);
  if (payload === null || startPayloadRoute(payload) !== "ugc") return false;
  if (!ugcTokenFromStart(payload)) return false;
  const site = siteUrl().replace(/\/$/, "");
  const url = `${site}/creator/join?token=${encodeURIComponent(payload)}`;
  await sendTelegramLinks(token, message.chat.id, TEXT, [
    { label: "Open on the site", url },
  ]);
  return true;
}
