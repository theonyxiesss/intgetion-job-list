/**
 * D559: whether the chat offers a web search after a turn's job results. A
 * turn may search twice; one that already showed jobs does not offer it when
 * a later search comes back empty.
 */
export type JobsSeen = { found: boolean; offerWeb: boolean };

export const NO_JOBS_YET: JobsSeen = { found: false, offerWeb: false };

export function afterJobResults(seen: JobsSeen, count: number): JobsSeen {
  const found = seen.found || count > 0;
  return { found, offerWeb: !found };
}
