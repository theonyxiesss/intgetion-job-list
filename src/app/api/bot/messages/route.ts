import { hasLocale } from "next-intl";
import { notFound, toErrorResponse, validationError } from "@/lib/http";
import { routing } from "@/i18n/routing";
import { pickMessages } from "@/i18n/client-messages";
import { SPOKI_NAMESPACES } from "@/components/bot/spoki-dock-model";

const ALLOWED = new Set<string>(SPOKI_NAMESPACES);

/**
 * `GET /api/bot/messages?locale=&ns=` — the chat's message namespaces for
 * the Spoki panel, loaded when the panel opens instead of on every page
 * (D476, D525). Public copy only; a namespace outside the chat's list is
 * refused.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const locale = url.searchParams.get("locale");
    if (!locale || !hasLocale(routing.locales, locale)) throw notFound();
    const namespaces = (url.searchParams.get("ns") ?? "")
      .split(",")
      .filter(Boolean);
    if (
      namespaces.length === 0 ||
      namespaces.some((namespace) => !ALLOWED.has(namespace))
    ) {
      throw validationError({ ns: "unknown namespace" });
    }
    const all = (await import(`../../../../messages/${locale}.json`))
      .default as Record<string, unknown>;
    return Response.json(pickMessages(all, namespaces), {
      // Copy changes only with a deploy, and a deploy starts a new cache.
      headers: { "cache-control": "public, max-age=300, s-maxage=86400" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
