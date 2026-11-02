import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeExternalHref, toMarkdown } from "@/lib/rich-text";
import { cn } from "./cn";

/**
 * Long text from a person or a job source as tidy Markdown (D591):
 * headings, paragraphs, lists, bold and links. The text is untrusted: raw
 * HTML is skipped (no rehype-raw), images are not loaded, a link is only
 * http(s) and opens in a new tab as nofollow ugc. h1/h2 render as h3 and
 * the rest as h4, so the page keeps its own heading order. A server
 * component: no Markdown parser reaches the browser bundle.
 */

function RichLink({ href, children }: ComponentPropsWithoutRef<"a">) {
  const safe = safeExternalHref(href);
  if (!safe) return <>{children}</>;
  return (
    <a
      href={safe}
      target="_blank"
      rel="nofollow ugc noopener noreferrer"
      className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg"
    >
      {children}
    </a>
  );
}

const H3 = "t-h3 mt-8 mb-3 first:mt-0";
const H4 = "mt-6 mb-2 font-semibold first:mt-0";

const components: Components = {
  h1: ({ children }) => <h3 className={H3}>{children}</h3>,
  h2: ({ children }) => <h3 className={H3}>{children}</h3>,
  h3: ({ children }) => <h3 className={H3}>{children}</h3>,
  h4: ({ children }) => <h4 className={H4}>{children}</h4>,
  h5: ({ children }) => <h4 className={H4}>{children}</h4>,
  h6: ({ children }) => <h4 className={H4}>{children}</h4>,
  p: ({ children }) => <p className="my-4 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-fg">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 marker:text-fg-muted first:mt-0 last:mb-0 [&_ol]:my-2 [&_ul]:my-2">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 marker:text-fg-muted first:mt-0 last:mb-0 [&_ol]:my-2 [&_ul]:my-2">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-line pl-4 text-fg-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-line" />,
  a: RichLink,
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-line bg-surface px-4 py-3 font-mono text-sm leading-6">
      {children}
    </pre>
  ),
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded-md bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-line px-3 py-2 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-line px-3 py-2 align-top">{children}</td>
  ),
  img: ({ alt }) => (alt ? <span>{alt}</span> : null),
};

const remarkPlugins = [remarkGfm];

export function RichText({
  text,
  className,
}: {
  text: string | null | undefined;
  /** Size and color; the default is the body text of a detail page. */
  className?: string;
}) {
  const markdown = toMarkdown(text);
  if (!markdown) return null;
  return (
    <div className={cn("max-w-[68ch] break-words", className ?? "t-body-l")}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={components}
        skipHtml
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
