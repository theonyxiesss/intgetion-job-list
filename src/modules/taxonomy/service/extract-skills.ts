import { normalizeSkillText } from "./normalize-skill-text";

/**
 * Skills named in a job text (D290). Imported jobs arrive without a skill
 * list, so the words of the title and the description are matched against
 * the alias table — the same keys the manual skill input already uses (D42).
 */

/** Words that are also skill aliases but usually mean nothing of the sort. */
const TOO_COMMON = new Set(["lean", "sales", "support"]);
/** A key shorter than this matches far too much ("go", "r", "ai"). */
const MIN_KEY_LENGTH = 3;
/** The longest alias is a few words ("apache airflow", "design systems"). */
const MAX_WORDS = 3;
/** A job gets at most this many skills, longest matches first. */
export const MAX_EXTRACTED_SKILLS = 10;

const WORD = /[a-zA-Z0-9+#.]+/g;

/**
 * Lookup keys for every one-to-three word run in the text, longest first.
 * The caller matches them against `skills_aliases.alias_normalized`.
 */
export function skillKeysInText(text: string): string[] {
  const words = text.slice(0, 20_000).match(WORD) ?? [];
  const byLength = new Map<string, number>();
  for (let start = 0; start < words.length; start++) {
    for (let size = 1; size <= MAX_WORDS; size++) {
      const run = words.slice(start, start + size);
      if (run.length < size) break;
      const key = normalizeSkillText(run.join(" "));
      if (key.length < MIN_KEY_LENGTH || TOO_COMMON.has(key)) continue;
      // A longer run wins: "machine learning" beats "learning".
      byLength.set(key, Math.max(byLength.get(key) ?? 0, size));
    }
  }
  return [...byLength.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key);
}

/**
 * Skill ids named in the text, strongest first. `aliases` maps a lookup key
 * to the skill it belongs to.
 */
export function extractSkillIds(
  text: string,
  aliases: ReadonlyMap<string, string>,
  limit = MAX_EXTRACTED_SKILLS,
): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const key of skillKeysInText(text)) {
    const skillId = aliases.get(key);
    if (!skillId || seen.has(skillId)) continue;
    seen.add(skillId);
    found.push(skillId);
    if (found.length >= limit) break;
  }
  return found;
}
