"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { consentAllows, readConsent, readCookie } from "@/lib/consent";

/** Optional "preferences" cookie (D219); deleted when consent is withdrawn. */
export const LAST_CATALOG_QUERY_COOKIE = "last_catalog_query";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const MAX_LENGTH = 1000;

/**
 * With "preferences" consent the catalog remembers the last filters and,
 * on an unfiltered visit, offers to bring them back (D219). Without
 * consent it neither reads nor writes anything.
 */
export function RememberFilters({
  query,
  label,
}: {
  /** Current filters as a query string, "" when the catalog is unfiltered. */
  query: string;
  label: string;
}) {
  const [restore, setRestore] = useState<string | null>(null);

  useEffect(() => {
    if (!consentAllows(readConsent(document.cookie), "preferences")) return;
    if (query) {
      if (query.length > MAX_LENGTH) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${LAST_CATALOG_QUERY_COOKIE}=${encodeURIComponent(query)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
      return;
    }
    const saved = readCookie(document.cookie, LAST_CATALOG_QUERY_COOKIE);
    if (!saved) return;
    try {
      // Re-encode: only a plain query string goes back into the link.
      const params = new URLSearchParams(decodeURIComponent(saved));
      params.delete("cursor");
      const restored = params.toString();
      // Cookies are only readable after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (restored) setRestore(restored);
    } catch {
      // A malformed cookie is ignored.
    }
  }, [query]);

  if (!restore) return null;
  return (
    <Link href={`/jobs?${restore}`} className="t-body-s self-start underline">
      {label}
    </Link>
  );
}
