import type { CandidateLanguageForScoring } from "../score/types";

/**
 * Country, time zone and languages for matching come from the shared
 * "about me" profile (D507, 29.8); the candidate row is the fallback until
 * stage 6.4d drops it. A shared language without a level takes the
 * candidate's level for that language, else B1: the level only weighs the
 * score, it never filters a job out.
 */

export type SharedForMatching = {
  country: string | null;
  timezone: string | null;
  languages: readonly { code: string; level: string | null }[];
} | null;

const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2", "native"]);
export const UNKNOWN_LEVEL = "B1" as const;

export function factsForMatching(
  candidate: {
    country: string | null;
    timezone: string;
    languages: readonly CandidateLanguageForScoring[];
  },
  shared: SharedForMatching,
): {
  country: string | null;
  timezone: string;
  languages: CandidateLanguageForScoring[];
} {
  const own = new Map(candidate.languages.map((item) => [item.lang, item]));
  const languages = shared?.languages.length
    ? shared.languages.map((item) => ({
        lang: item.code,
        level: (item.level && LEVELS.has(item.level)
          ? item.level
          : (own.get(item.code)?.level ??
            UNKNOWN_LEVEL)) as CandidateLanguageForScoring["level"],
      }))
    : [...candidate.languages];
  return {
    country: shared?.country ?? candidate.country,
    timezone: shared?.timezone ?? candidate.timezone,
    languages,
  };
}
