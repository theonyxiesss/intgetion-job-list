"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  browserGpc,
  consentAllows,
  readConsent,
  readCookie,
} from "@/lib/consent";

const VISITOR_COOKIE = "_ia";
const VISITOR_MAX_AGE_SECONDS = 395 * 24 * 60 * 60;

/**
 * Own analytics beacon (D225, D226): one POST per page view. Counting works
 * without cookies; with analytics consent (and no GPC) a random `_ia` id
 * also lets returning visits be linked.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    const allowed = consentAllows(readConsent(document.cookie), "analytics", {
      gpc: browserGpc(),
    });
    if (allowed && !readCookie(document.cookie, VISITOR_COOKIE)) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${VISITOR_COOKIE}=${crypto.randomUUID()}; Path=/; Max-Age=${VISITOR_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    }
    const body = JSON.stringify({
      path: window.location.pathname,
      search: window.location.search,
      // Only the landing view says where the visitor came from.
      referrer: first.current ? document.referrer || null : null,
    });
    first.current = false;
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/a", blob)) {
      void fetch("/api/a", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [pathname]);

  return null;
}
