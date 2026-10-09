/**
 * Old snapshot rows stored a line that says the job was imported.
 * Visitors should see the vacancy, not that label (D376).
 */
const BOILERPLATE = [
  /Imported from [^:\n]+: the full description, requirements and how to apply are on the original posting \(Apply opens it\)\.?/gi,
  /Импортировано с [^:\n]+: полное описание, требования и способ отклика — в оригинальной вакансии \(кнопка «Откликнуться» откроет её\)\.?/gi,
];

export function publicJobText(text: string | null | undefined): string {
  if (!text) return "";
  let next = text;
  for (const pattern of BOILERPLATE) next = next.replace(pattern, "");
  return next.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
