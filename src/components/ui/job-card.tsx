import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ListingCard } from "./listing-card";

export type JobCardStat = {
  label: string;
  value: ReactNode;
  muted?: boolean;
  /** The one fact that leads: salary. Large in the footer when known; quiet there when not. */
  lead?: boolean;
};

/**
 * Job card for lists (DESIGN.md 8.5, D441), drawn by the shared ListingCard
 * (D479). Presentational: the page maps its data here. Salary leads the
 * footer; when it is unknown, "not specified" stands there quietly.
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
  headingLevel,
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
  /** H2 when the list sits straight under the page H1; H3 under a section H2. */
  headingLevel?: 2 | 3;
}) {
  const lead = stats.find((stat) => stat.lead) ?? null;
  const facts = [
    ...stats
      .filter((stat) => stat !== lead && !stat.muted)
      .map((stat) => stat.value),
    ...(meta ?? []),
  ];
  return (
    <ListingCard
      href={href}
      title={title}
      transitionName={transitionName}
      label={category}
      badges={badges}
      mark={mark}
      subtitle={
        companyHref ? (
          <Link
            href={companyHref}
            className="t-body-s relative z-10 -my-[1.5px] inline-flex min-h-6 min-w-6 items-center self-start text-fg-muted underline-offset-4 hover:underline"
          >
            {companyName}
          </Link>
        ) : (
          <p className="t-body-s text-fg-muted">{companyName}</p>
        )
      }
      facts={facts}
      summary={summary}
      tags={skills}
      tagLimit={tagLimit}
      moreTagsLabel={moreSkillsLabel}
      lead={
        lead ? (
          lead.muted ? (
            <p className="t-body-s text-fg-muted">{lead.value}</p>
          ) : (
            <p className="t-data-l text-fg">
              <span className="sr-only">{lead.label}. </span>
              {lead.value}
            </p>
          )
        ) : null
      }
      viewLabel={viewLabel}
      actions={actions}
      compact={compact}
      headingLevel={headingLevel}
    />
  );
}
