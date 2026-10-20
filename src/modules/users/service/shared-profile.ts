import { logger } from "@/lib/logger";
import { isValidTimeZone } from "@/lib/tz";
import * as repo from "../repo/shared-profile-repo";
import type { SharedProfileInput } from "../schemas";

/**
 * The shared "about me" profile (D503, 29.8): one name, country, city, time
 * zone and languages for every role. Role forms keep writing their own
 * rows; each save also notes its facts here.
 */

export type SharedLanguage = { code: string; level: string | null };

export type SharedProfile = {
  displayName: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  languages: SharedLanguage[];
  about: string | null;
};

export type SharedFacts = {
  displayName?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  languages?: readonly { code: string; level?: string | null }[];
};

/**
 * `replace`: a named fact overwrites (candidate and employer forms are the
 * person's own name and place). `fill`: only empty fields are set and new
 * languages are added (a creator's name is a nickname, Q2 of 29.10).
 * Neither clears a field: clearing belongs to the account page.
 */
export type NoteMode = "replace" | "fill";

const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2", "native"]);

export const EMPTY_PROFILE: SharedProfile = {
  displayName: null,
  country: null,
  city: null,
  timezone: null,
  languages: [],
  about: null,
};

function text(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, max) : null;
}

function country(value: string | null | undefined): string | null {
  const upper = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(upper) ? upper : null;
}

function zone(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed && trimmed.length <= 64 && isValidTimeZone(trimmed)
    ? trimmed
    : null;
}

function languages(value: SharedFacts["languages"]): SharedLanguage[] | null {
  if (!value?.length) return null;
  const seen = new Map<string, SharedLanguage>();
  for (const item of value) {
    const code = item.code.trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(code) || seen.has(code)) continue;
    const level = item.level && LEVELS.has(item.level) ? item.level : null;
    seen.set(code, { code, level });
  }
  return seen.size ? [...seen.values()] : null;
}

/** The profile after noting these facts, or null when nothing changes. */
export function mergeSharedFacts(
  current: SharedProfile | null,
  facts: SharedFacts,
  mode: NoteMode,
): SharedProfile | null {
  const base = current ?? EMPTY_PROFILE;
  const next: SharedProfile = { ...base, languages: [...base.languages] };
  const incoming = {
    displayName: text(facts.displayName, 120),
    country: country(facts.country),
    city: text(facts.city, 120),
    timezone: zone(facts.timezone),
  };
  for (const key of Object.keys(incoming) as (keyof typeof incoming)[]) {
    const value = incoming[key];
    if (value === null) continue;
    if (mode === "replace" || next[key] === null) next[key] = value;
  }
  const langs = languages(facts.languages);
  if (langs) {
    if (mode === "replace") {
      // A list without levels (a creator form) keeps the levels already known.
      const known = new Map(
        next.languages.map((item) => [item.code, item.level]),
      );
      next.languages = langs.map((item) => ({
        code: item.code,
        level: item.level ?? known.get(item.code) ?? null,
      }));
    } else {
      const known = new Set(next.languages.map((item) => item.code));
      for (const item of langs)
        if (!known.has(item.code)) next.languages.push(item);
    }
  }
  const changed =
    current === null ||
    JSON.stringify(next) !== JSON.stringify(current ?? EMPTY_PROFILE);
  const empty = JSON.stringify(next) === JSON.stringify(EMPTY_PROFILE);
  return changed && !empty ? next : null;
}

export async function readSharedProfile(
  userId: string,
): Promise<SharedProfile | null> {
  return repo.findSharedProfile(userId);
}

/**
 * Notes a role form's facts in the shared profile. Never throws: the role
 * row is already saved, and a miss here is logged, not shown to the person.
 */
export async function noteSharedProfile(
  userId: string,
  facts: SharedFacts,
  mode: NoteMode,
): Promise<void> {
  try {
    const current = await repo.findSharedProfile(userId);
    const next = mergeSharedFacts(current, facts, mode);
    if (next) await repo.saveSharedProfile(userId, next);
  } catch (error) {
    logger.warn({ err: error }, "users: shared profile not noted");
  }
}

/** The account page saves the whole shared profile; empty clears (D504). */
export async function updateSharedProfile(
  userId: string,
  input: SharedProfileInput,
): Promise<SharedProfile> {
  const seen = new Set<string>();
  const profile: SharedProfile = {
    ...input,
    languages: input.languages.filter((item) =>
      seen.has(item.code) ? false : (seen.add(item.code), true),
    ),
  };
  await repo.saveSharedProfile(userId, profile);
  return profile;
}

/**
 * The shared profile reaches the roles that already exist (D504): name and
 * place to the candidate, country and languages to the creator, whose name stays a nickname. A role that is not started yet
 * takes it from its prefilled form. Imported lazily: those modules note
 * their own saves back here.
 */
export async function applySharedToRoles(
  userId: string,
  profile: SharedProfile,
): Promise<void> {
  const [candidates, ugc] = await Promise.all([
    import("@/modules/candidates/service"),
    import("@/modules/ugc/service"),
  ]);
  const steps: Promise<unknown>[] = [
    candidates.applySharedBasics(userId, {
      fullName: profile.displayName,
      country: profile.country,
      city: profile.city,
      timezone: profile.timezone,
    }),
    ugc.applySharedToCreator(userId, {
      country: profile.country,
      languages: profile.languages.map((item) => item.code),
    }),
  ];
  for (const result of await Promise.allSettled(steps))
    if (result.status === "rejected")
      logger.warn({ err: result.reason }, "users: role not updated");
}

/** A change Spoki proposes: only the named fields, languages added or removed. */
export type SharedPatch = {
  displayName?: string;
  country?: string;
  city?: string;
  timezone?: string;
  about?: string;
  addLanguages?: readonly { code: string; level?: string | null }[];
  removeLanguages?: readonly string[];
};

/** The profile after the patch; invalid values are dropped, never stored. */
export function applySharedPatch(
  current: SharedProfile | null,
  patch: SharedPatch,
): SharedProfile {
  const base = mergeSharedFacts(
    current,
    {
      displayName: patch.displayName,
      country: patch.country,
      city: patch.city,
      timezone: patch.timezone,
    },
    "replace",
  ) ?? { ...(current ?? EMPTY_PROFILE) };
  const about = patch.about?.trim();
  if (about) base.about = about.slice(0, 1000);
  const removed = new Set(
    (patch.removeLanguages ?? []).map((code) => code.trim().toLowerCase()),
  );
  let languages = base.languages.filter((item) => !removed.has(item.code));
  if (patch.addLanguages?.length) {
    const added =
      mergeSharedFacts(
        { ...EMPTY_PROFILE, languages },
        { languages: patch.addLanguages },
        "replace",
      )?.languages ?? [];
    const byCode = new Map(languages.map((item) => [item.code, item]));
    for (const item of added) byCode.set(item.code, item);
    languages = [...byCode.values()];
  }
  return { ...base, languages };
}

/** Spoki's confirmed change: save, then carry it into the roles (D505). */
export async function patchSharedProfile(
  userId: string,
  patch: SharedPatch,
): Promise<SharedProfile> {
  const next = applySharedPatch(await repo.findSharedProfile(userId), patch);
  await repo.saveSharedProfile(userId, next);
  await applySharedToRoles(userId, next);
  return next;
}

/** Export of personal data (17-gdpr). */
export async function exportSharedProfile(userId: string) {
  return repo.findSharedProfile(userId);
}
