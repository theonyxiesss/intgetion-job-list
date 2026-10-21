/**
 * D514: the draft card (with the link to the form) shows when the draft is
 * complete or the person asked for it; until then Spoki's text is the form.
 */
export function draftCardDue(missing: unknown, asked: unknown): boolean {
  return asked === true || (Array.isArray(missing) && missing.length === 0);
}
