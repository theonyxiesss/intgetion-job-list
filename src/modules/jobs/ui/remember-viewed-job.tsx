"use client";

import { useEffect } from "react";
import { consentAllows, readConsent, readCookie } from "@/lib/consent";
import {
  RECENT_JOBS_COOKIE,
  RECENT_JOBS_MAX,
  parseRecentJobs,
} from "./recent-jobs";

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** With "preferences" consent a job page joins "You viewed" (D228). */
export function RememberViewedJob({ jobId }: { jobId: string }) {
  useEffect(() => {
    if (!consentAllows(readConsent(document.cookie), "preferences")) return;
    const ids = [
      jobId,
      ...parseRecentJobs(
        readCookie(document.cookie, RECENT_JOBS_COOKIE),
      ).filter((id) => id !== jobId),
    ].slice(0, RECENT_JOBS_MAX);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${RECENT_JOBS_COOKIE}=${ids.join(".")}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  }, [jobId]);
  return null;
}
