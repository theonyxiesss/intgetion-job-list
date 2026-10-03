"use client";

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
  async function onClick(event: { preventDefault: () => void }) {
    event.preventDefault();
    let next = href;
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply-external`, {
        method: "POST",
      });
      if (response.ok) {
        const body = (await response.json()) as { externalUrl?: string };
        if (body.externalUrl) next = body.externalUrl;
      }
    } catch {
      next = href;
    }
    window.location.assign(next);
  }

  return (
    <a
      className="inline-flex min-h-11 items-center self-start rounded bg-accent px-4 py-3 text-accent-fg"
      href={href}
      rel="noreferrer"
      onClick={onClick}
    >
      {label}
    </a>
  );
}
