import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Tag } from "./badge";
import { Morph, navForward } from "./page-transition";
import { cn } from "./cn";

export type JobCardStat = {
  label: string;
  value: ReactNode;
  muted?: boolean;
  /** Salary and the like: beside the title on a wide card, first on a narrow one. */
  lead?: boolean;
};

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
  const lead = stats.find((stat) => stat.lead) ?? null;
  const rest = stats.filter((stat) => stat !== lead);
  const viewControl = (className?: string) =>
    viewLabel ? (
      <span
        aria-hidden="true"
        className={cn(
          "t-nav pointer-events-none self-start border border-line-strong px-3 py-2 text-fg transition-colors group-hover:border-accent",
          className,
        )}
      >
        {viewLabel}
      </span>
    ) : null;
  return (
    <article
      className={cn(
        "@container group relative flex flex-col gap-3 border border-line bg-bg p-4 transition-colors duration-[120ms] hover:border-line-strong hover:bg-surface-2 focus-within:border-accent @min-[640px]:p-5",
        compact && "p-4",
      )}
    >
      {(category || badges) && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            actions ? "@min-[640px]:pr-28" : undefined,
          )}
        >
          {category && (
            <span className="t-label mr-2 text-fg-muted">{category}</span>
          )}
          {badges}
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-3 @min-[640px]:grid-cols-[minmax(0,1fr)_minmax(180px,min(320px,max-content))] @min-[640px]:gap-x-8">
        <div
          className={cn("flex min-w-0", mark ? "items-start gap-3" : undefined)}
        >
          {mark}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="t-h3 line-clamp-3 break-words @min-[640px]:line-clamp-2">
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
        </div>
        {lead && (
          <div className="flex flex-col gap-1 @min-[640px]:items-end @min-[640px]:text-right">
            <span className="t-label text-fg-muted">{lead.label}</span>
            <span
              className={cn(
                "t-data break-words",
                lead.muted ? "text-fg-muted" : "",
              )}
            >
              {lead.value}
            </span>
            {viewControl(
              "mt-2 hidden @min-[640px]:inline-flex @min-[640px]:self-end",
            )}
          </div>
        )}
        {summary && !compact && (
          <p className="t-body-s line-clamp-2 hidden max-w-[65ch] break-words text-fg-muted @min-[640px]:block">
            {summary}
          </p>
        )}
        {rest.length > 0 && (
          <dl className="flex flex-col gap-3 @min-[640px]:col-span-2 @min-[640px]:flex-row @min-[640px]:flex-wrap @min-[640px]:items-start @min-[640px]:gap-0">
            {rest.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "flex min-w-0 flex-col gap-1",
                  index > 0 &&
                    "@min-[640px]:ml-4 @min-[640px]:border-l @min-[640px]:border-line @min-[640px]:pl-4",
                )}
              >
                <dt className="t-label text-fg-muted">{stat.label}</dt>
                <dd
                  className={cn(
                    "t-data break-words",
                    stat.muted ? "text-fg-muted" : "",
                  )}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {shown.length > 0 && !compact && (
          <ul className="flex flex-wrap gap-2 @min-[640px]:col-span-2">
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
      </div>
      {viewControl(lead ? "@min-[640px]:hidden" : undefined)}
      {actions && (
        <div className="relative z-10 flex gap-1 @min-[640px]:absolute @min-[640px]:top-4 @min-[640px]:right-4">
          {actions}
        </div>
      )}
    </article>
  );
}
