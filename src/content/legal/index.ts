import legal from "./legal.json";

/** Legal texts synced from docs/content/legal-*.md (`pnpm legal:sync`, D241). */
export type LegalDocumentKey = keyof typeof legal;

/** ru and pt-BR have their own text (D350); every other language reads en. */
export function legalText(document: LegalDocumentKey, locale: string): string {
  const texts = legal[document];
  if (locale === "ru") return texts.ru;
  if (locale === "pt-BR") return texts["pt-BR"];
  return texts.en;
}
