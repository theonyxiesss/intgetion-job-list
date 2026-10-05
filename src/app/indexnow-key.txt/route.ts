import { indexNowKey } from "@/modules/seo/indexnow";

export const dynamic = "force-dynamic";

/** Proves the site owns its IndexNow key (D284). 404 when there is no key. */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response(null, { status: 404 });
  return new Response(key, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
