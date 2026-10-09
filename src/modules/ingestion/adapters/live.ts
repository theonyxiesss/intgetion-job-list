import type { RawImportedJob } from "./types";

/**
 * A live source (8B, D375): an official API the source lets other sites
 * show, with its name and a link back. Scraping HTML is not allowed (D18).
 */
export interface LiveSource {
  readonly sourceName: string;
  readonly kind: "api" | "rss";
  readonly url: string;
  /** No more often than the source's own terms allow. */
  readonly minIntervalMs: number;
  /** New jobs per run, so the catalog grows evenly; known ones still refresh. */
  readonly newPerRun: number;
  fetch(fetchImpl?: typeof fetch): Promise<RawImportedJob[]>;
}

const FETCH_TIMEOUT_MS = 15_000;
export const hours = (count: number) => count * 60 * 60 * 1000;

/** Fetch JSON with the 13.1 timeout and our name in the user agent. */
export async function fetchJson(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "INTGETION-JOB-LIST (+https://intgetion.com)",
      },
    });
    if (!response.ok) throw new Error(`${url} responded ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** HTML into plain text with paragraph breaks, at most 8000 characters. */
export function plain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|li|h[1-6]|div)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
    .slice(0, 8000);
}

export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function idOf(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

/** Only https links on the source's own site count as the apply link. */
export function onHost(url: string, hosts: readonly string[]): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      hosts.includes(parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

const EMPLOYMENT: Record<string, string> = {
  full_time: "full_time",
  "full-time": "full_time",
  "full time": "full_time",
  part_time: "part_time",
  "part-time": "part_time",
  "part time": "part_time",
  contract: "contract",
  contractor: "contract",
  temporary: "contract",
  freelance: "freelance",
  internship: "internship",
  intern: "internship",
};

/** Unknown types stay null; normalize makes them full_time (13.2). */
export function employment(value: string): string | null {
  return EMPLOYMENT[value.trim().toLowerCase()] ?? null;
}

/** "Salary: 100000 – 150000 USD / year", or null without numbers. */
export function salaryLine(
  min: unknown,
  max: unknown,
  currency: string,
  period: string,
): string | null {
  const range = [min, max].filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (range.length === 0) return null;
  return `Salary: ${range.join(" – ")} ${currency || "USD"} / ${period || "year"}`;
}

/** The body plus the facts we do not model yet (pay, where), as text. */
export function withFacts(
  body: string,
  facts: readonly (string | null | undefined)[],
): string {
  return [body, ...facts]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n\n")
    .trim();
}

/**
 * Keep every job already stored (so a short run does not expire it) and only
 * `limit` jobs that are new (D338).
 */
export function withinCreateBudget<T extends { externalId: string }>(
  records: readonly T[],
  linked: ReadonlySet<string>,
  limit: number,
): T[] {
  let room = limit;
  const kept: T[] = [];
  for (const record of records) {
    if (linked.has(record.externalId.trim())) {
      kept.push(record);
      continue;
    }
    if (room <= 0) continue;
    room -= 1;
    kept.push(record);
  }
  return kept;
}

/** Rows through a mapper, dropping the ones it refuses. */
export function mapRows<T>(
  rows: unknown,
  map: (row: Record<string, unknown>) => T | null,
): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const mapped = map(row as Record<string, unknown>);
    return mapped ? [mapped] : [];
  });
}
