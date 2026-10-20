/**
 * Languages typed as one line on the account page (D504): "en C1, ru native".
 * Pure, so the form and the tests share it.
 */

export type LanguageEntry = { code: string; level: string | null };

const LEVELS: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
  native: "native",
};

export function formatLanguages(items: readonly LanguageEntry[]): string {
  return items
    .map((item) => (item.level ? `${item.code} ${item.level}` : item.code))
    .join(", ");
}

/** The entries, or null when a part is not "code" or "code level". */
export function parseLanguages(text: string): LanguageEntry[] | null {
  const seen = new Map<string, LanguageEntry>();
  for (const part of text.split(",")) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const code = words[0]!.toLowerCase();
    if (!/^[a-z]{2}$/.test(code) || words.length > 2) return null;
    const level = words[1] ? LEVELS[words[1].toLowerCase()] : null;
    if (words[1] && !level) return null;
    if (!seen.has(code)) seen.set(code, { code, level: level ?? null });
  }
  return seen.size > 20 ? null : [...seen.values()];
}
