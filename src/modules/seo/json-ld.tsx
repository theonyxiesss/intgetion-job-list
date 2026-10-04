import { headers } from "next/headers";
import { serializeJsonLd } from "./job-posting";

/** A schema.org data block with the request CSP nonce (D211). */
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
