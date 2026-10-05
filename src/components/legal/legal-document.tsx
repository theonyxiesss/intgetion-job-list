import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { headingId, parseLegal } from "./parse";

/**
 * Renders our own legal Markdown (D241) — a small subset: headings, lists,
 * paragraphs, tables, **bold** and [links](…). The texts are ours, never
 * user content, and still become React elements, not HTML.
 */

function inline(
  text: string,
  values: Record<string, string | null>,
  missing: string,
): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\{\{(\w+)\}\}/g;
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      out.push(
        <strong key={key++}>{inline(match[1], values, missing)}</strong>,
      );
    } else if (match[2] !== undefined) {
      const href = match[3]!;
      out.push(
        href.startsWith("/") ? (
          <Link
            key={key++}
            href={href.replace(/^\/(en|ru)(?=\/)/, "")}
            className="underline"
          >
            {match[2]}
          </Link>
        ) : (
          <a key={key++} href={href} className="underline" rel="noreferrer">
            {match[2]}
          </a>
        ),
      );
    } else {
      const value = values[match[4]!];
      out.push(
        value ? (
          value
        ) : (
          <span key={key++} className="text-fg-muted">
            [{missing}]
          </span>
        ),
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function LegalDocument({
  markdown,
  values,
  missing,
}: {
  markdown: string;
  /** {{key}} substitutions (LEGAL_DETAILS). */
  values: Record<string, string | null>;
  /** Shown for a value that is not set yet. */
  missing: string;
}) {
  const blocks = parseLegal(markdown);
  return (
    <article className="flex max-w-[72ch] flex-col gap-4">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading": {
            const content = inline(block.text, values, missing);
            const id = headingId(block.text);
            if (block.level === 1) {
              return (
                <h1
                  key={index}
                  className="t-display-l break-words hyphens-auto"
                >
                  {content}
                </h1>
              );
            }
            return block.level === 2 ? (
              <h2
                key={index}
                id={id}
                className="t-h2 scroll-mt-24 break-words hyphens-auto pt-4"
              >
                {content}
              </h2>
            ) : (
              <h3 key={index} id={id} className="t-h3 scroll-mt-24 pt-2">
                {content}
              </h3>
            );
          }
          case "list":
            return (
              <ul key={index} className="flex list-disc flex-col gap-2 pl-6">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{inline(item, values, missing)}</li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={index} className="overflow-x-auto">
                <table className="t-body-s w-full border-collapse">
                  <thead>
                    <tr>
                      {block.head.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          className="border-b border-line-strong px-3 py-2 text-left align-bottom"
                        >
                          {inline(cell, values, missing)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border-b border-line px-3 py-2 align-top"
                          >
                            {inline(cell, values, missing)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return (
              <p key={index} className="t-body">
                {inline(block.text, values, missing)}
              </p>
            );
        }
      })}
    </article>
  );
}
