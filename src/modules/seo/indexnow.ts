import { logger } from "@/lib/logger";
import { SEO_LOCALES, siteUrl } from "./site";

/**
 * IndexNow (D284): tells Bing, Yandex and the other taking part that a page
 * appeared or changed, instead of waiting for the next crawl. One key proves
 * the site is ours; it is served as a text file at the path below.
 */
const ENDPOINT = "https://api.indexnow.org/IndexNow";
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

/** The key, or null when the site has none and nothing should be sent. */
export function indexNowKey(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const key = env.INDEXNOW_KEY?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

/** Every language version of one path, e.g. "/jobs/<id>". */
export function localeUrls(path: string): string[] {
  const base = siteUrl();
  return SEO_LOCALES.map((locale) => `${base}/${locale}${path}`);
}

/**
 * Sends the URLs. Never throws and never blocks the caller's work: search
 * engines learning late is not a reason to fail publishing a job.
 */
export async function submitToIndexNow(
  paths: readonly string[],
  fetcher: typeof fetch = fetch,
): Promise<"sent" | "skipped" | "failed"> {
  const key = indexNowKey();
  const base = siteUrl();
  if (!key || paths.length === 0 || base.includes("localhost")) {
    return "skipped";
  }
  const urlList = paths.flatMap((path) => localeUrls(path)).slice(0, 10_000);
  try {
    const response = await fetcher(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host: new URL(base).host,
        key,
        keyLocation: `${base}${INDEXNOW_KEY_PATH}`,
        urlList,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    // 200 accepted, 202 accepted but the key is still being checked.
    if (response.status !== 200 && response.status !== 202) {
      logger.warn({ status: response.status }, "indexnow refused the ping");
      return "failed";
    }
    return "sent";
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.name : "Error" },
      "indexnow ping failed",
    );
    return "failed";
  }
}
