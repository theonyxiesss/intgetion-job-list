import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Tag } from "./badge";
import { Morph, navForward } from "./page-transition";
import { cn } from "./cn";

export type JobCardStat = { label: string; value: ReactNode; muted?: boolean };

/**
 * Job card for lists (DESIGN.md 8.5). Purely presentational: the page maps
 * its data to these props. The title link covers the whole card; `actions`
 * sit above it and stay clickable.
 */
export function JobCard({
  href,
  title,
  category,
  badges,
  companyName,
  companyHref,
  stats,
  skills = [],
  tagLimit = 5,
  moreSkillsLabel,
  actions,
  compact = false,
  transitionName,
  meta,
  summary,
  viewLabel,
}: {
  href: string;
  title: string;
  category?: string;
  /** Badge elements: verified, trusted, imported, new. */
  badges?: ReactNode;
  companyName: string;
  companyHref?: string;
  stats: JobCardStat[];
  skills?: string[];
  /** How many skill and perk tags to show before "+N". */
  tagLimit?: number;
  /** e.g. "+3" when more skills are hidden. */
  moreSkillsLabel?: (hidden: number) => string;
  actions?: ReactNode;
  compact?: boolean;
  /** Same name as the job page H1, e.g. `job-title-<id>`: the title morphs. */
  transitionName?: string;
  /** One quiet line under the company: place · format · date. */
  meta?: string[];
  /** Two lines of the description at most. */
  summary?: string | null;
  /** Visible "View job" control; the whole card stays the link. */
  viewLabel?: string;
}) {
  const titleLink = (
    <Link
      href={href}
      {...navForward}
      className="outline-none after:absolute after:inset-0 after:content-['']"
    >
      {title}
    </Link>
  );
  const shown = skills.slice(0, tagLimit);
  const hidden = skills.length - shown.length;
  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 border border-line bg-bg transition-colors duration-[120ms] hover:border-line-strong hover:bg-surface-2 focus-within:border-accent",
        compact ? "p-4" : "p-5 md:p-6",
      )}
    >
      {(category || badges) && (
        <div className="flex flex-wrap items-center gap-2 pr-28">
          {category && (
            <span className="t-label mr-2 text-fg-muted">{category}</span>
          )}
          {badges}
        </div>
      )}
      <div className="flex flex-col gap-1 pr-0 md:pr-28">
        <h3 className="t-h3 break-words">
          {transitionName ? (
            <Morph name={transitionName}>{titleLink}</Morph>
          ) : (
            titleLink
          )}
        </h3>
        {companyHref ? (
          <Link
            href={companyHref}
            className="t-body-s relative z-10 self-start text-fg-muted underline-offset-4 hover:underline"
          >
            {companyName}
          </Link>
        ) : (
          <p className="t-body-s text-fg-muted">{companyName}</p>
        )}
        {meta && meta.length > 0 && (
          <p className="t-body-s text-fg-muted break-words">
            {meta.join(" · ")}
          </p>
        )}
      </div>
      {summary && (
        <p className="t-body-s line-clamp-2 max-w-[75ch] break-words text-fg-muted">
          {summary}
        </p>
      )}
      {stats.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="t-label text-fg-muted">{stat.label}</dt>
              <dd className={cn("t-data", stat.muted ? "text-fg-muted" : "")}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {shown.length > 0 && !compact && (
        <ul className="flex flex-wrap gap-2">
          {shown.map((skill) => (
            <li key={skill}>
              <Tag>{skill}</Tag>
            </li>
          ))}
          {hidden > 0 && moreSkillsLabel && (
            <li>
              <Tag>{moreSkillsLabel(hidden)}</Tag>
            </li>
          )}
        </ul>
      )}
      {viewLabel && (
        <span
          aria-hidden="true"
          className="t-nav self-start border border-line-strong px-4 py-3 text-fg transition-colors group-hover:border-accent"
        >
          {viewLabel}
        </span>
      )}
      {actions && (
        <div className="relative z-10 flex gap-1 md:absolute md:top-4 md:right-4">
          {actions}
        </div>
      )}
    </article>
  );
}
