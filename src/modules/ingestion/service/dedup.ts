import type { NormalizedImportedJob } from "./normalize";

export function normalizeDedupePart(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function dedupeKey(
  job: Pick<
    NormalizedImportedJob,
    "title" | "companyDomain" | "companyName" | "location" | "workFormat"
  >,
): string {
  return [
    normalizeDedupePart(job.title),
    normalizeDedupePart(job.companyDomain || job.companyName),
    normalizeDedupePart(job.location) || (job.workFormat === "remote" ? "remote" : ""),
  ].join("|");
}

export function areNearDuplicates(
  left: Pick<NormalizedImportedJob, "title" | "description" | "companyDomain" | "companyName">,
  right: Pick<NormalizedImportedJob, "title" | "description" | "companyDomain" | "companyName">,
  similarity: (a: string, b: string) => number,
): boolean {
  const sameCompany =
    left.companyDomain && right.companyDomain
      ? left.companyDomain === right.companyDomain
      : normalizeDedupePart(left.companyName) ===
        normalizeDedupePart(right.companyName);
  return Boolean(
    sameCompany &&
    similarity(left.title, right.title) >= 0.85 &&
    similarity(left.description.slice(0, 500), right.description.slice(0, 500)) >= 0.8,
  );
}
