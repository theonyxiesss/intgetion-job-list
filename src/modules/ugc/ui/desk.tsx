import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  ClipboardList,
  Clapperboard,
  ExternalLink,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Play,
  Plus,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import type {
  UgcCampaignStatus,
  UgcParticipationStatus,
  UgcSubmissionStatus,
} from "@/config/ugc";
import {
  DESK_HREFS,
  DESK_SECTIONS,
  linkLabel,
  monogram,
  videoPlatform,
  type DeskSection,
} from "../service/workspace-view";

/**
 * The company's UGC workspace (D519): one header, one section nav, the
 * same statuses drawn three ways — a badge for a brief, a dot for a
 * participation, a line on a video. Server components; the writes stay in
 * `UgcAction` and the forms.
 */

const NAV_ICONS: Record<DeskSection, LucideIcon> = {
  overview: LayoutDashboard,
  campaigns: Megaphone,
  creators: Users,
  orders: ClipboardList,
  materials: Clapperboard,
  payments: Wallet,
};

export async function DeskNav({
  active,
  counts = {},
}: {
  active: DeskSection | null;
  counts?: Partial<Record<DeskSection, number>>;
}) {
  const t = await getTranslations("ugcDesk");
  return (
    <nav aria-label={t("navLabel")} className="md:border-b md:border-line">
      <ul className="grid grid-cols-3 gap-2 md:-mb-px md:flex md:gap-7">
        {DESK_SECTIONS.map((section) => {
          const current = section === active;
          const count = counts[section];
          return (
            <li key={section} className="min-w-0">
              <Link
                href={DESK_HREFS[section]}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "t-body-s relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 text-center transition-colors duration-[120ms] md:min-h-11 md:flex-row md:gap-2 md:rounded-none md:border-0 md:px-0 md:py-0 md:text-[15px]",
                  current
                    ? "border-fg text-fg"
                    : "border-line text-fg-muted hover:text-fg",
                )}
              >
                <Icon icon={NAV_ICONS[section]} size={16} />
                <span className="truncate">{t(`nav.${section}`)}</span>
                {count ? (
                  <span className="t-data text-fg-muted">
                    <span className="sr-only">{t("navCount")}</span>
                    {count}
                  </span>
                ) : null}
                {current ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 hidden h-0.5 bg-fg md:block"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Header, nav and body of every workspace page. */
export async function DeskShell({
  active,
  title,
  intro,
  actions,
  counts,
  children,
}: {
  active: DeskSection | null;
  title: string;
  intro?: string;
  /** Replaces the default "new brief" pair; pass `null` for none. */
  actions?: ReactNode;
  counts?: Partial<Record<DeskSection, number>>;
  children: ReactNode;
}) {
  const t = await getTranslations("ugcDesk");
  return (
    <main className="py-8 md:py-12">
      <Container className="flex flex-col gap-8">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="t-label text-fg-muted">{t("label")}</p>
              <h1 className="t-h2 break-words">{title}</h1>
              {intro ? (
                <p className="max-w-[68ch] text-fg-muted">{intro}</p>
              ) : null}
            </div>
            {actions === undefined ? (
              <div className="flex flex-wrap gap-3">
                <ButtonLink
                  href="/campaigns/new"
                  variant="strong"
                  icon={<Icon icon={Plus} size={16} />}
                >
                  {t("newBrief")}
                </ButtonLink>
                <ButtonLink
                  href="/chat?from=campaigns"
                  variant="secondary"
                  icon={<Icon icon={MessageSquare} size={16} />}
                >
                  {t("withSpoki")}
                </ButtonLink>
              </div>
            ) : actions ? (
              <div className="flex flex-wrap gap-3">{actions}</div>
            ) : null}
          </div>
          <DeskNav active={active} counts={counts} />
        </header>
        {children}
      </Container>
    </main>
  );
}

/** A titled block of a workspace page. */
export function DeskSectionBlock({
  id,
  title,
  aside,
  children,
  className,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="t-h3 scroll-mt-24">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const CAMPAIGN_TONES: Record<UgcCampaignStatus, BadgeTone> = {
  draft: "neutral",
  pending_review: "pending",
  open: "new",
  paused: "pending",
  closed: "neutral",
  rejected: "danger",
};

/** A brief's status: an outlined badge, text always present. */
export async function CampaignStatus({
  status,
}: {
  status: UgcCampaignStatus;
}) {
  const t = await getTranslations("ugc");
  return <Badge tone={CAMPAIGN_TONES[status]}>{t(`status.${status}`)}</Badge>;
}

const PARTICIPATION_DOTS: Record<UgcParticipationStatus, string> = {
  applied: "bg-signal",
  offered: "bg-warning",
  hired: "bg-success",
  declined: "border border-line-strong",
  expired: "border border-line-strong",
  withdrawn: "border border-line-strong",
};

/** A participation's status: a 6 px dot before the word. */
export async function ParticipationStatus({
  status,
}: {
  status: UgcParticipationStatus;
}) {
  const t = await getTranslations("ugc");
  return (
    <span className="t-body-s inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-1.5 shrink-0 rounded-full",
          PARTICIPATION_DOTS[status],
        )}
      />
      {t(`status.${status}`)}
    </span>
  );
}

const SUBMISSION_LINES: Record<UgcSubmissionStatus, string> = {
  submitted: "border-t-warning",
  changes_requested: "border-t-signal",
  accepted: "border-t-success",
  winner: "border-t-success",
  rejected: "border-t-danger",
};

/** A video's status: a 2 px line above a mono label. */
export async function SubmissionStatus({
  status,
}: {
  status: UgcSubmissionStatus;
}) {
  const t = await getTranslations("ugcDesk");
  return (
    <p
      className={cn(
        "t-label flex items-center gap-1.5 border-t-2 pt-2 text-fg",
        SUBMISSION_LINES[status],
      )}
    >
      {status === "winner" ? <Icon icon={Trophy} size={16} /> : null}
      {t(`video.${status}`)}
    </p>
  );
}

/**
 * Large preview of a submitted video. The link is opened by the person, in
 * a new tab; the server never fetches the page (27.10), so the tile shows
 * the platform and the creator's hook instead of a frame.
 */
export async function VideoPreview({
  url,
  hook,
  creatorName,
  size = "md",
}: {
  url: string;
  hook: string;
  creatorName: string;
  size?: "md" | "lg";
}) {
  const t = await getTranslations("ugcDesk");
  const platform = videoPlatform(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("openVideo", {
        name: creatorName,
        platform: t(`platform.${platform}`),
      })}
      className={cn(
        "group relative flex aspect-[9/16] shrink-0 flex-col justify-between overflow-hidden rounded-lg bg-fg p-3 text-bg",
        size === "lg" ? "w-36 sm:w-48" : "w-28 sm:w-36",
      )}
    >
      <span className="t-label flex items-center justify-between gap-2 opacity-80">
        {t(`platform.${platform}`)}
        <Icon icon={ExternalLink} size={16} />
      </span>
      <span
        aria-hidden="true"
        className="mx-auto flex size-11 items-center justify-center rounded-full border border-current transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      >
        <Icon icon={Play} size={20} />
      </span>
      <span className="t-body-s line-clamp-4 break-words">
        {hook || linkLabel(url)}
      </span>
    </a>
  );
}

/** Name tile: creators have no stored photo, so their initials. */
export function Monogram({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-fg font-mono text-bg",
        size === "lg" ? "size-16 text-[20px]" : "size-11 text-[15px]",
      )}
    >
      {monogram(name)}
    </span>
  );
}

export type DeskCreatorCard = {
  userId: string;
  displayName: string;
  languages: string[];
  platforms: string[];
  niches: string[];
  country: string | null;
  exampleUrls: string[];
};

/**
 * A creator's public card as a small portfolio: who, where they post, and
 * their example links. No contact is on it (27.6).
 */
export async function CreatorProfileCard({
  card,
  footer,
  headingLevel = 3,
}: {
  card: DeskCreatorCard;
  footer?: ReactNode;
  headingLevel?: 3 | 4;
}) {
  const t = await getTranslations("ugc");
  const d = await getTranslations("ugcDesk");
  const name = card.displayName || t("creator");
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line bg-bg p-4 md:p-5">
      <div className="flex items-start gap-4">
        <Monogram name={name} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <Heading className="t-h3 break-words">{name}</Heading>
          <p className="t-body-s font-mono text-fg-muted">
            {[
              card.country ?? d("anyCountry"),
              card.languages.map((code) => code.toUpperCase()).join(" · "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={t("fields.platforms")}>
        {card.platforms.map((platform) => (
          <li
            key={platform}
            className="t-label inline-flex h-6 items-center rounded-full border border-fg px-2.5 text-fg"
          >
            {t(`platforms.${platform}`)}
          </li>
        ))}
        {card.niches.map((niche) => (
          <li
            key={niche}
            className="t-body-s inline-flex min-h-6 items-center rounded-full border border-line px-2.5 text-fg-muted"
          >
            {t(`niches.${niche}`)}
          </li>
        ))}
      </ul>
      {card.exampleUrls.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="t-label text-fg-muted">{d("portfolio")}</p>
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {card.exampleUrls.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-body-s flex min-h-11 items-center justify-between gap-3 px-3 hover:bg-surface"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="t-label shrink-0 text-fg-muted">
                      {d(`platform.${videoPlatform(url)}`)}
                    </span>
                    <span className="truncate">{linkLabel(url)}</span>
                  </span>
                  <Icon icon={ExternalLink} size={16} />
                  <span className="sr-only">{d("newTab")}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="t-body-s text-fg-muted">{d("noPortfolio")}</p>
      )}
      {footer}
    </article>
  );
}

/** A label and a value; values in mono. */
export function Fact({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="t-label text-fg-muted">{label}</dt>
      <dd className={cn("break-words text-fg", mono && "t-data")}>{value}</dd>
    </div>
  );
}

/** A short empty block inside a section, with one way forward. */
export function DeskEmpty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong p-5 md:p-6">
      <p className="font-medium">{title}</p>
      {text ? (
        <p className="t-body-s max-w-[60ch] text-fg-muted">{text}</p>
      ) : null}
      {action}
    </div>
  );
}

/** Filter links that keep their state in the URL; they wrap, never scroll. */
export async function DeskFilter<T extends string>({
  label,
  items,
}: {
  label: string;
  items: {
    value: T;
    label: string;
    href: string;
    active: boolean;
    /** Left out when a count would mean nothing, as for a company. */
    count?: number;
  }[];
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.value}>
            <Link
              href={item.href}
              aria-current={item.active ? "true" : undefined}
              className={cn(
                "t-body-s inline-flex min-h-11 items-center gap-2 rounded-full border px-4 transition-colors duration-[120ms]",
                item.active
                  ? "border-fg bg-fg text-bg"
                  : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {item.label}
              {item.count === undefined ? null : (
                <span className="t-data">{item.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A signed-in person without a company: the workspace needs one first. */
export async function NeedCompany() {
  const d = await getTranslations("ugcDesk");
  return (
    <DeskEmpty
      title={d("needCompanyTitle")}
      text={d("needCompanyText")}
      action={
        <ButtonLink href="/employer/company" variant="strong">
          {d("createCompany")}
        </ButtonLink>
      }
    />
  );
}

/**
 * Placeholder while a workspace page reads its briefs. A Suspense fallback
 * inside the page, not `loading.tsx`: the sign-in redirect and the 404 of a
 * foreign brief must stay real HTTP answers (D519).
 */
export async function DeskSkeleton() {
  const t = await getTranslations("ugcDesk");
  return (
    <main className="py-8 md:py-12" aria-busy="true">
      <Container className="flex flex-col gap-8">
        <p className="sr-only" role="status">
          {t("loading")}
        </p>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-72 max-w-full" />
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex md:gap-7">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-11 md:w-24" />
          ))}
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      </Container>
    </main>
  );
}
