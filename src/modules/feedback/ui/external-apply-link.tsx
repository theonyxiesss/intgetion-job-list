"use client";

import { buttonClass } from "@/components/ui/button";
import { publicHttpUrl } from "@/lib/company-mark";

/**
 * Imported jobs: a click records applied_external, then opens the posting.
 * Without JavaScript the same link still goes straight to the external URL.
 */
export function ExternalApplyLink({
  jobId,
  href,
  label,
}: {
  jobId: string;
  href: string;
  label: string;
}) {
  const safeHref = publicHttpUrl(href);
  if (!safeHref) return null;

  async function onClick(event: { preventDefault: () => void }) {
    event.preventDefault();
    let next = safeHref;
    if (!next) return;
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply-external`, {
        method: "POST",
      });
      if (response.ok) {
        const body = (await response.json()) as { externalUrl?: string };
        const fromServer = publicHttpUrl(body.externalUrl);
        if (fromServer) next = fromServer;
      }
    } catch {
      next = safeHref;
    }
    if (next) window.location.assign(next);
  }

  return (
    <a
      className={buttonClass("primary")}
      href={safeHref}
      rel="noreferrer"
      onClick={onClick}
    >
      {label}
    </a>
  );
}
