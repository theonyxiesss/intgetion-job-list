import { HttpError, notFound } from "@/lib/http";
import * as repo from "../repo/suggestions";

export type SkillSuggestionDto = {
  id: string;
  rawText: string;
  normalized: string;
  source: string;
  occurrences: number;
  createdAt: string;
};

function toDto(row: repo.SuggestionRow): SkillSuggestionDto {
  return {
    id: row.id,
    rawText: row.rawText,
    normalized: row.normalized,
    source: row.source,
    occurrences: Number(row.occurrences),
    createdAt: row.createdAt.toISOString(),
  };
}

function encodeCursor(row: repo.SuggestionRow): string {
  return Buffer.from(`${row.occurrences}:${row.id}`).toString("base64url");
}

function decodeCursor(cursor: string): repo.SuggestionCursor {
  const [occurrences, id] = Buffer.from(cursor, "base64url")
    .toString("utf8")
    .split(":");
  const parsed = Number(occurrences);
  if (!id || !Number.isInteger(parsed)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor");
  }
  return { occurrences: parsed, id };
}

/** Cursor pagination per section 6: `{ items, nextCursor }`. */
export async function listSkillSuggestions(input: {
  cursor?: string;
  limit: number;
}): Promise<{ items: SkillSuggestionDto[]; nextCursor: string | null }> {
  const rows = await repo.listPendingSuggestions(
    input.limit + 1,
    input.cursor ? decodeCursor(input.cursor) : undefined,
  );
  const page = rows.slice(0, input.limit);
  const last = page.at(-1);
  return {
    items: page.map(toDto),
    nextCursor: rows.length > input.limit && last ? encodeCursor(last) : null,
  };
}

/**
 * Maps a suggestion to a skill (10A, 11.1). Unknown suggestion or skill →
 * 404; already decided → 409; its text already an alias of another skill →
 * 409 with that skill in details.
 */
export async function mapSkillSuggestion(
  suggestionId: string,
  skillId: string,
): Promise<SkillSuggestionDto> {
  const suggestion = await repo.findSuggestion(suggestionId);
  if (!suggestion) throw notFound();
  if (!(await repo.findActiveSkillById(skillId))) throw notFound();
  const outcome = await repo.mapSuggestion(suggestionId, skillId);
  if (outcome.kind === "not_pending") {
    throw new HttpError(409, "ALREADY_DECIDED", "Suggestion already decided");
  }
  if (outcome.kind === "alias_taken") {
    throw new HttpError(409, "ALIAS_TAKEN", "Alias belongs to another skill", {
      skillId: outcome.skillId,
    });
  }
  return toDto(suggestion);
}

export async function rejectSkillSuggestion(
  suggestionId: string,
): Promise<SkillSuggestionDto> {
  const suggestion = await repo.findSuggestion(suggestionId);
  if (!suggestion) throw notFound();
  if (!(await repo.rejectSuggestion(suggestionId))) {
    throw new HttpError(409, "ALREADY_DECIDED", "Suggestion already decided");
  }
  return toDto(suggestion);
}

export const countPendingSkillSuggestions = repo.countPendingSuggestions;

export const listActiveSkills = repo.listActiveSkills;
