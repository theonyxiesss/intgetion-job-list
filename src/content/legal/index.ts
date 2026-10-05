import legal from "./legal.json";

/** Legal texts synced from docs/content/legal-*.md (`pnpm legal:sync`, D241). */
export type LegalDocumentKey = keyof typeof legal;

export function legalText(document: LegalDocumentKey, locale: string): string {
  return legal[document][locale === "ru" ? "ru" : "en"];
}
