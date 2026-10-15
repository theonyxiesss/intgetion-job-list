import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Tag } from "./badge";
import { Morph, navForward } from "./page-transition";
import { cn } from "./cn";

export type JobCardStat = {
  label: string;
  value: ReactNode;
  muted?: boolean;
  /** The one fact that leads: salary. Large when known; last in the line when not. */
  lead?: boolean;
};

/**
 * Job card for lists (DESIGN.md 8.5, D441). Presentational: the page maps
 * its data here. The title link covers the card; company and actions sit
 * above it.
 */
export function JobCard({
  href,
  title,
  category,
  badges,
  companyName,
  companyHref,
  mark,
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
  /** Company logo, or a stand-in mark when the company has none. */
  mark?: ReactNode;
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
  /** Quiet tail of the fact line: place and date. */
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
  const lead = stats.find((stat) => stat.lead) ?? null;
  const facts = [
    ...stats
      .filter((stat) => stat !== lead && !stat.muted)
      .map((stat) => stat.value),
    ...(meta ?? []),
    ...(lead?.muted ? [lead.value] : []),
  ];
  const viewControl = (className?: string) =>
    viewLabel ? (
      <span
        aria-hidden="true"
        className={cn(
          "t-nav pointer-events-none shrink-0 self-start rounded-full border border-line-strong px-3 py-2 text-fg transition-colors group-hover:border-fg-subtle",
          className,
        )}
      >
        {viewLabel}
      </span>
    ) : null;

  return (
    <article
      className={cn(
        "@container group relative flex flex-col gap-3 rounded-lg border border-line bg-bg p-4 transition-colors duration-[120ms] hover:border-line-strong hover:bg-surface-2 focus-within:border-accent @min-[640px]:p-5",
        compact && "p-4",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3",
          actions ? "@min-[640px]:pr-28" : undefined,
        )}
      >
        {mark}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-4">
            <h3 className="t-h3 line-clamp-2 min-w-0 break-words">
              {transitionName ? (
                <Morph name={transitionName}>{titleLink}</Morph>
              ) : (
                titleLink
              )}
            </h3>
            {viewControl("hidden @min-[640px]:inline-flex")}
          </div>
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
          {lead && !lead.muted ? (
            <p className="t-data text-[18px] leading-snug text-fg">
              <span className="sr-only">{lead.label}. </span>
              {lead.value}
            </p>
          ) : null}
          {facts.length > 0 ? (
            <p className="t-body-s break-words text-fg">
              {facts.map((fact, index) => (
                <span key={index}>
                  {index > 0 ? (
                    <span className="text-fg-muted"> · </span>
                  ) : null}
                  {fact}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
      {(category || badges) && (
        <div className="flex flex-wrap items-center gap-2">
          {category ? (
            <span className="t-label text-fg-muted">{category}</span>
          ) : null}
          {badges}
        </div>
      )}
      {summary && !compact ? (
        <p className="t-body-s line-clamp-2 max-w-[68ch] break-words text-fg-muted">
          {summary}
        </p>
      ) : null}
      {shown.length > 0 && !compact ? (
        <ul className="flex flex-wrap gap-2">
          {shown.map((skill) => (
            <li key={skill}>
              <Tag>{skill}</Tag>
            </li>
          ))}
          {hidden > 0 && moreSkillsLabel ? (
            <li>
              <Tag>{moreSkillsLabel(hidden)}</Tag>
            </li>
          ) : null}
        </ul>
      ) : null}
      {viewControl("@min-[640px]:hidden")}
      {actions ? (
        <div className="relative z-10 flex gap-1 @min-[640px]:absolute @min-[640px]:top-4 @min-[640px]:right-4">
          {actions}
        </div>
      ) : null}
    </article>
  );
}
