// Copies the legal texts from docs/content/legal-*.md into
// src/content/legal/legal.json, which the /terms and /privacy pages render
// (D241). Run `pnpm legal:sync` after editing the Markdown; a unit test
// fails while the two differ.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS = { terms: "legal-terms.md", privacy: "legal-privacy.md" };

/**
 * One document as { ru, en, "pt-BR" }: comments dropped, split at
 * <!-- en --> and <!-- pt-BR --> (D350).
 */
export function splitLegal(markdown) {
  const [ru, rest] = markdown.split(/^<!-- en -->\s*$/m);
  const [en, ptBR] = (rest ?? "").split(/^<!-- pt-BR -->\s*$/m);
  const clean = (text) => (text ?? "").replace(/<!--[\s\S]*?-->/g, "").trim();
  return { ru: clean(ru), en: clean(en), "pt-BR": clean(ptBR) };
}

export function buildLegal(root) {
  return Object.fromEntries(
    Object.entries(DOCS).map(([key, file]) => [
      key,
      splitLegal(readFileSync(join(root, "docs", "content", file), "utf8")),
    ]),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
  writeFileSync(
    join(root, "src", "content", "legal", "legal.json"),
    `${JSON.stringify(buildLegal(root), null, 2)}\n`,
  );
  console.log("legal texts synced");
}
