/**
 * Parser of our own legal Markdown (D241): headings, lists, paragraphs and
 * tables. Kept free of React and routing so tests can load it alone.
 */

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

export function parseLegal(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split(/\r?\n/);
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1]!.length as 1 | 2 | 3,
        text: heading[2]!,
      });
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index]!.startsWith("- ")) {
        items.push(lines[index]!.slice(2));
        index += 1;
      }
      blocks.push({ kind: "list", items });
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index]!.startsWith("|")) {
        const row = cells(lines[index]!);
        if (!row.every((cell) => /^:?-+:?$/.test(cell))) rows.push(row);
        index += 1;
      }
      blocks.push({ kind: "table", head: rows[0] ?? [], rows: rows.slice(1) });
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index]!.trim() &&
      !/^(#{1,3} |- |\|)/.test(lines[index]!)
    ) {
      paragraph.push(lines[index]!.trim());
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}

/** Anchor of a heading: the cookie section is #cookies, others #s<number>. */
export function headingId(text: string): string | undefined {
  if (/cookie|куки/i.test(text) && /^\d+\./.test(text)) return "cookies";
  const number = /^(\d+(?:\.\d+)?)\.?\s/.exec(text)?.[1];
  return number ? `s${number.replace(".", "-")}` : undefined;
}
