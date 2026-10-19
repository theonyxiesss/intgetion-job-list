import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Tag } from "./badge";
import { Morph, navForward } from "./page-transition";
import { cn } from "./cn";

/**
 * One card for every list on the site (D479): jobs, freelance services,
 * events. Same shell, same order: label row, title, one line of facts, a
 * short summary, tags, then a footer with the number that matters (salary,
 * price, date) in mono and an "Open" pill. The title link covers the card;
 * links inside it (company, actions) sit above that layer.
 */
export function ListingCard({
  href,
  title,
  headingLevel = 3,
  transitionName,
  label,
  badges,
  mark,
  subtitle,
  facts = [],
  summary,
  tags = [],
  tagLimit = 5,
  moreTagsLabel,
  lead,
  trail,
  viewLabel,
  actions,
  compact = false,
}: {
  href: string;
  title: string;
  /** 2 when the list sits right under the page H1, else 3. */
  headingLevel?: 2 | 3;
  /** Same name as the detail page H1: the title morphs into it. */
  transitionName?: string;
  /** Kind or category, uppercase mono from `t-label`. */
  label?: string;
  badges?: ReactNode;
  /** Logo or stand-in mark beside the title. */
  mark?: ReactNode;
  /** Who: company or seller. May hold its own link. */
  subtitle?: ReactNode;
  /** Short facts joined by a middle dot. */
  facts?: ReactNode[];
  /** Two lines at most. */
  summary?: string | null;
  tags?: string[];
  tagLimit?: number;
  /** e.g. "+3" for tags that do not fit. */
  moreTagsLabel?: (hidden: number) => string;
  /** The footer number: salary, price or date. */
  lead?: ReactNode;
  /** Quiet text beside the pill: days, track record. */
  trail?: ReactNode;
  /** Visible "Open" pill; the whole card stays the link. */
  viewLabel?: string;
  /** Buttons above the link layer, top right on wide cards. */
  actions?: ReactNode;
  compact?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const titleLink = (
    <Link
      href={href}
      {...navForward}
      className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
    >
      {title}
    </Link>
  );
  const shown = tags.slice(0, tagLimit);
  const hidden = tags.length - shown.length;
  const hasFooter = Boolean(lead || trail || viewLabel);

  return (
    <article
      className={cn(
        "@container group relative flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2 focus-within:border-accent md:p-5",
        compact && "md:p-4",
      )}
    >
      {label || badges ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            actions ? "@min-[640px]:pr-28" : undefined,
          )}
        >
          {label ? (
            <span className="t-label text-fg-muted">{label}</span>
          ) : null}
          {badges}
        </div>
      ) : null}
      <div
        className={cn(
          "flex items-start gap-3",
          actions && !(label || badges) ? "@min-[640px]:pr-28" : undefined,
        )}
      >
        {mark}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Heading className="t-h3 line-clamp-2 min-w-0 break-words">
            {transitionName ? (
              <Morph name={transitionName}>{titleLink}</Morph>
            ) : (
              titleLink
            )}
          </Heading>
          {subtitle}
        </div>
      </div>
      {facts.length > 0 ? (
        <p className="t-body-s break-words text-fg">
          {facts.map((fact, index) => (
            <span key={index}>
              {index > 0 ? <span className="text-fg-muted"> · </span> : null}
              {fact}
            </span>
          ))}
        </p>
      ) : null}
      {summary && !compact ? (
        <p className="t-body-s line-clamp-2 max-w-[68ch] break-words text-fg-muted">
          {summary}
        </p>
      ) : null}
      {shown.length > 0 && !compact ? (
        <ul className="flex flex-wrap gap-2">
          {shown.map((tag) => (
            <li key={tag}>
              <Tag>{tag}</Tag>
            </li>
          ))}
          {hidden > 0 && moreTagsLabel ? (
            <li>
              <Tag>{moreTagsLabel(hidden)}</Tag>
            </li>
          ) : null}
        </ul>
      ) : null}
      {hasFooter ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3">
          <div className="min-w-0">{lead}</div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {trail}
            {viewLabel ? (
              <span
                aria-hidden="true"
                className="t-nav pointer-events-none inline-flex shrink-0 rounded-full border border-line-strong px-3 py-1.5 text-fg transition-colors group-hover:border-fg-subtle"
              >
                {viewLabel}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      {actions ? (
        <div className="relative z-10 flex gap-1 @min-[640px]:absolute @min-[640px]:top-4 @min-[640px]:right-4">
          {actions}
        </div>
      ) : null}
    </article>
  );
}
