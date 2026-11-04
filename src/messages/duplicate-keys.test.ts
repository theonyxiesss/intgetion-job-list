import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Frame = { keys: Set<string> | null; path: string; key?: string };

/**
 * JSON.parse keeps the last of two equal keys without a word, so a merge
 * can leave a dead string behind (services.form.done, 2026-11-04). This
 * walks the raw text and names every key repeated inside one object.
 */
function duplicateKeys(text: string): string[] {
  const found: string[] = [];
  const stack: Frame[] = [];
  let lastString: string | null = null;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      let j = i + 1;
      let value = "";
      while (text[j] !== '"') {
        value += text[j] === "\\" ? text[++j] : text[j];
        j += 1;
      }
      lastString = value;
      i = j + 1;
      continue;
    }
    const top = stack.at(-1);
    if (ch === ":" && top?.keys && lastString !== null) {
      const path = top.path ? `${top.path}.${lastString}` : lastString;
      if (top.keys.has(lastString)) found.push(path);
      top.keys.add(lastString);
      top.key = lastString;
    } else if (ch === "{" || ch === "[") {
      const path = !top
        ? ""
        : top.keys && top.key !== undefined
          ? top.path
            ? `${top.path}.${top.key}`
            : top.key
          : top.path;
      stack.push({ keys: ch === "{" ? new Set() : null, path });
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
    i += 1;
  }
  return found;
}

describe("duplicateKeys", () => {
  it("finds a key repeated inside one object, with its path", () => {
    expect(
      duplicateKeys('{"a": {"done": "x", "b": "y", "done": "z"}, "done": 1}'),
    ).toEqual(["a.done"]);
  });

  it("allows the same key in other objects and inside arrays", () => {
    expect(
      duplicateKeys(
        '{"a": {"k": 1}, "b": {"k": 2}, "c": [{"k": 1}, {"k": 2}]}',
      ),
    ).toEqual([]);
  });

  it("is not fooled by braces, colons and quotes inside strings", () => {
    expect(duplicateKeys('{"a": "x: {y} \\"q\\"", "b": 1}')).toEqual([]);
  });
});

describe("message catalogs", () => {
  const dir = join(process.cwd(), "src", "messages");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    it(`${file} has no repeated keys`, () => {
      expect(duplicateKeys(readFileSync(join(dir, file), "utf8"))).toEqual([]);
    });
  }
});
