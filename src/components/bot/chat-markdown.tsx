"use client";

import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  memo,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

/**
 * Spoki's answers as Markdown (D514): bold, lists, headings, links, code
 * and tables, like a modern chat. The text is the model's and untrusted:
 * raw HTML is dropped, images are not loaded, a link is a site path or an
 * https address, and an outside link opens in a new tab without referrer.
 */

/** Reveal speed: at least this many characters per second... */
const MIN_CHARS_PER_SECOND = 80;
/** ...and the whole answer, however long, is typed within this time. */
const FULL_ANSWER_MS = 1200;

/** How many characters to show after `elapsed` ms (D514): a steady pace. */
export function nextRevealLength(
  shown: number,
  total: number,
  elapsedMs: number,
): number {
  if (shown >= total) return total;
  const perMs = Math.max(MIN_CHARS_PER_SECOND / 1000, total / FULL_ANSWER_MS);
  return Math.min(total, shown + Math.max(1, Math.round(perMs * elapsedMs)));
}

/**
 * A half-revealed answer may stop inside `**bold`, `` `code `` or a code
 * fence; close them so the reader does not see raw marks for a moment.
 */
export function closeOpenMarks(text: string): string {
  let out = text;
  const fences = (out.match(/^```/gm) ?? []).length;
  if (fences % 2 === 1) return `${out}\n\`\`\``;
  const outside = out.replace(/```[\s\S]*?```/g, "");
  if ((outside.match(/`/g) ?? []).length % 2 === 1) out += "`";
  if ((outside.match(/\*\*/g) ?? []).length % 2 === 1) out += "**";
  return out;
}

/** A site path or an https address; everything else is not a link. */
export function safeHref(href: string | undefined): string | null {
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function CopyButton({
  text,
  label,
  done,
}: {
  text: string | (() => string);
  label: string;
  done: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(typeof text === "function" ? text() : text)
          .then(() => setCopied(true))
          .catch(() => undefined);
      }}
      className={ACTION}
    >
      <Icon icon={copied ? Check : Copy} size={16} />
      <span className="sr-only">{copied ? done : label}</span>
    </button>
  );
}

const ACTION =
  "inline-flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg aria-pressed:text-fg";

/** 👍 / 👎 on one stored answer (D514); a second press takes it back. */
function RateButtons({ messageId }: { messageId: string }) {
  const t = useTranslations("chat.answer");
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  function rate(next: "up" | "down") {
    const value = rating === next ? null : next;
    const before = rating;
    setRating(value);
    void fetch("/api/bot/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, rating: value }),
    })
      .then((response) => {
        if (!response.ok) setRating(before);
      })
      .catch(() => setRating(before));
  }
  return (
    <>
      <button
        type="button"
        aria-pressed={rating === "up"}
        onClick={() => rate("up")}
        className={ACTION}
      >
        <Icon
          icon={ThumbsUp}
          size={16}
          fill={rating === "up" ? "currentColor" : "none"}
        />
        <span className="sr-only">{t("good")}</span>
      </button>
      <button
        type="button"
        aria-pressed={rating === "down"}
        onClick={() => rate("down")}
        className={ACTION}
      >
        <Icon
          icon={ThumbsDown}
          size={16}
          fill={rating === "down" ? "currentColor" : "none"}
        />
        <span className="sr-only">{t("bad")}</span>
      </button>
    </>
  );
}

function CodeBlock({ children }: { children: ReactNode }) {
  const t = useTranslations("chat.answer");
  const ref = useRef<HTMLPreElement>(null);
  return (
    <div className="my-3 overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex justify-end border-b border-line px-1">
        <CopyButton
          text={() => ref.current?.textContent ?? ""}
          label={t("copyCode")}
          done={t("copied")}
        />
      </div>
      <pre
        ref={ref}
        className="overflow-x-auto px-4 py-3 font-mono text-sm leading-6"
      >
        {children}
      </pre>
    </div>
  );
}

function MarkdownLink({ href, children }: ComponentPropsWithoutRef<"a">) {
  const safe = safeHref(href);
  if (!safe) return <>{children}</>;
  const className =
    "text-fg underline decoration-line underline-offset-4 hover:decoration-fg";
  if (safe.startsWith("/"))
    return (
      <Link href={safe} className={className}>
        {children}
      </Link>
    );
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className={className}
    >
      {children}
    </a>
  );
}

const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  h1: ({ children }) => (
    <p className="mt-4 mb-2 font-semibold first:mt-0">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="mt-4 mb-2 font-semibold first:mt-0">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="mt-3 mb-1 font-semibold first:mt-0">{children}</p>
  ),
  h4: ({ children }) => (
    <p className="mt-3 mb-1 font-semibold first:mt-0">{children}</p>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-line pl-3 text-fg-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-line" />,
  a: MarkdownLink,
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded-md bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-line">
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
  // Only `lastWordTail` makes spans (raw HTML is skipped). A new key per
  // word remounts it, so each new word comes out of a blur once (D588).
  span: ({ className, children, ...props }) => (
    <span
      key={String((props as Record<string, unknown>)["data-word"] ?? "")}
      className={className}
    >
      {children}
    </span>
  ),
};

type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/** The deepest last text with something in it, and the node that holds it. */
function lastText(node: HastNode): [HastNode, HastNode] | null {
  const kids = node.children ?? [];
  for (let index = kids.length - 1; index >= 0; index -= 1) {
    const kid = kids[index]!;
    if (kid.type === "text" && kid.value?.trim()) return [node, kid];
    const found = kid.children ? lastText(kid) : null;
    if (found) return found;
  }
  return null;
}

/**
 * Rehype step for a typing answer: wraps its last word in a span keyed by
 * its number in the text, so the key changes only when a new word starts.
 */
function lastWordTail(options: { words: number }) {
  return (tree: HastNode) => {
    const found = lastText(tree);
    if (!found) return;
    const [owner, text] = found;
    const value = text.value ?? "";
    const cut = value.search(/\S+\s*$/);
    if (cut < 0) return;
    const word: HastNode = {
      type: "element",
      tagName: "span",
      properties: {
        className: ["spoki-word"],
        dataWord: String(options.words),
      },
      children: [{ type: "text", value: value.slice(cut) }],
    };
    const kids = owner.children ?? [];
    kids.splice(
      kids.indexOf(text),
      1,
      ...(cut > 0 ? [{ type: "text", value: value.slice(0, cut) }] : []),
      word,
    );
  };
}

const remarkPlugins = [remarkGfm];

/** One rendered answer; memoised so old answers do not re-parse. */
export const ChatMarkdown = memo(function ChatMarkdown({
  text,
}: {
  text: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      components={components}
      skipHtml
    >
      {text}
    </ReactMarkdown>
  );
});

type RehypePlugins = ComponentPropsWithoutRef<
  typeof ReactMarkdown
>["rehypePlugins"];

/** The part of an answer typed so far; its newest word fades in (D588). */
export const LiveMarkdown = memo(function LiveMarkdown({
  text,
}: {
  text: string;
}) {
  const words = text.trim().split(/\s+/).length;
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={[[lastWordTail, { words }]] as RehypePlugins}
      components={components}
      skipHtml
    >
      {text}
    </ReactMarkdown>
  );
});

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * A Spoki answer. A live one types itself out (D514); an answer from the
 * history, or under reduced motion, shows at once. `onTyping` lets the log hold
 * screen-reader announcements until the whole text is there.
 */
export function AssistantAnswer({
  text,
  live,
  messageId,
  onRetry,
  onTyping,
}: {
  text: string;
  live: boolean;
  /** The stored answer: 👍 / 👎 show only when it is known. */
  messageId?: string;
  /** Only on the last answer: asks the same question once more. */
  onRetry?: () => void;
  onTyping?: (typing: boolean) => void;
}) {
  const t = useTranslations("chat.answer");
  const [animate] = useState(() => live && !prefersReducedMotion());
  const [shown, setShown] = useState(0);
  const typing = animate && shown < text.length;

  useEffect(() => {
    if (!typing) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const elapsed = now - last;
      last = now;
      setShown((current) => nextRevealLength(current, text.length, elapsed));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [typing, text.length]);

  useEffect(() => {
    onTyping?.(typing);
  }, [typing, onTyping]);
  useEffect(() => () => onTyping?.(false), [onTyping]);

  return (
    <div className="group/answer min-w-0">
      <div className="max-w-full break-words leading-7">
        {animate ? (
          <LiveMarkdown
            text={typing ? closeOpenMarks(text.slice(0, shown)) : text}
          />
        ) : (
          <ChatMarkdown text={text} />
        )}
      </div>
      {typing ? null : (
        <div className="-mb-2 -ml-3 flex">
          <CopyButton text={text} label={t("copy")} done={t("copied")} />
          {messageId ? (
            <RateButtons key={messageId} messageId={messageId} />
          ) : null}
          {onRetry ? (
            <button type="button" onClick={onRetry} className={ACTION}>
              <Icon icon={RotateCcw} size={16} />
              <span className="sr-only">{t("retry")}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
