import { publicJobText } from "@/lib/public-job-text";

/** Enough for three narrow lines or two wide ones; CSS clamps the rest. */
const SUMMARY_MAX = 240;

/**
 * Plain first words of the description for a job card (D398). Markup is
 * dropped, whitespace collapsed. A long text is cut at a word boundary and
 * ends with "…", never in the middle of a word.
 */
export function jobCardSummary(description: string | null): string | null {
  const visible = publicJobText(description);
  if (!visible) return null;
  const plain = visible
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  if (plain.length <= SUMMARY_MAX) return plain;
  const head = plain.slice(0, SUMMARY_MAX);
  const space = head.lastIndexOf(" ");
  const cut = space > SUMMARY_MAX / 2 ? head.slice(0, space) : head;
  return `${cut.replace(/[\s.,;:!?·–—-]+$/, "")}…`;
}
