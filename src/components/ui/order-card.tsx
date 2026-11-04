import type { ReactNode } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { OrderStage, OrderStepName, OrderTone } from "@/lib/order-stage";
import { cn } from "./cn";
import { Icon } from "./icon";
import { OrderSteps } from "./order-steps";
import { navForward } from "./page-transition";
import { ServiceIconBox, type ServiceIconName } from "./service-icon";

/**
 * One order, freelance or UGC (D605, from the D602 mockup): service mark
 * and short number, status as a 6 px dot and a word, title, the money in
 * mono, a date, the four steps, then who and what to do next. The title
 * link covers the card; the footer and the "next step" toggle sit above
 * that layer. Server component: the toggle is a native <details>.
 */

const DOT: Record<OrderTone, string> = {
  waiting: "bg-fg-muted",
  work: "bg-signal",
  review: "bg-warning",
  done: "bg-success",
  closed: "border border-line-strong",
};

/**
 * The word stays in text colours: warning and success on the light surface
 * are under 4.5:1 as small text (D605); the dot carries the colour.
 */
const TEXT: Record<OrderTone, string> = {
  waiting: "text-fg-muted",
  work: "text-fg",
  review: "text-fg",
  done: "text-fg",
  closed: "text-fg-muted",
};

export function OrderCard({
  href,
  icon,
  code,
  status,
  stage,
  stepLabels,
  stepsLabel,
  title,
  headingLevel = 3,
  subtitle,
  price,
  date,
  person,
  actions,
  next,
}: {
  href: string;
  icon: ServiceIconName;
  /** Short mono number, e.g. "FR / 3F2A". */
  code: string;
  /** Translated status word. */
  status: string;
  stage: OrderStage;
  stepLabels: Record<OrderStepName, string>;
  stepsLabel: string;
  title: string;
  /** 2 when the list sits right under the page H1, else 3. */
  headingLevel?: 2 | 3;
  /** Package, rights, version. */
  subtitle?: ReactNode;
  price: { label: string; value: string };
  date?: { label: string; value: ReactNode };
  /** The other side: initials and name. */
  person?: { name: string; initials: string };
  /** Buttons or links above the link layer, bottom right. */
  actions?: ReactNode;
  /**
   * What happens next, behind a toggle, and a visible way into the order;
   * `yours` marks that the reader has the next move.
   */
  next?: { label: string; text: string; open: string; yours?: boolean };
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-line bg-surface transition-colors duration-150 focus-within:border-accent hover:border-line-strong">
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-3">
            <ServiceIconBox name={icon} />
            <span className="truncate font-mono text-xs tracking-wide text-fg-muted">
              {code}
            </span>
          </span>
          <span
            className={cn(
              "t-caption inline-flex shrink-0 items-center gap-2 whitespace-nowrap",
              TEXT[stage.tone],
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-block size-1.5 shrink-0 rounded-full",
                DOT[stage.tone],
              )}
            />
            {status}
          </span>
        </div>
        <Heading className="t-h3 line-clamp-2 min-w-0 break-words">
          <Link
            href={href}
            {...navForward}
            className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
          >
            {title}
          </Link>
        </Heading>
        {subtitle ? (
          <div className="t-body-s mt-2 break-words text-fg-muted">
            {subtitle}
          </div>
        ) : null}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-6 pb-5">
          <div className="min-w-0">
            <p className="t-label text-fg-muted">{price.label}</p>
            <p className="mt-1.5 font-mono text-2xl tracking-tight tabular-nums">
              {price.value}
            </p>
          </div>
          {date ? (
            <div className="text-right">
              <p className="t-label text-fg-muted">{date.label}</p>
              <p className="t-data mt-1.5">{date.value}</p>
            </div>
          ) : null}
        </div>
        <OrderSteps stage={stage} labels={stepLabels} label={stepsLabel} />
      </div>
      {person || actions ? (
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 md:px-5">
          {person ? (
            <span className="t-body-s flex min-w-0 items-center gap-2.5 text-fg-muted">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-[10px] text-fg"
              >
                {person.initials}
              </span>
              <span className="truncate">{person.name}</span>
            </span>
          ) : (
            <span />
          )}
          {actions ? (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {next ? (
        <details className="group/next relative z-10 border-t border-line">
          <summary className="t-body-s flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-b-lg px-4 py-2 md:px-5 [&::-webkit-details-marker]:hidden">
            <span
              className={cn(
                "inline-flex items-center gap-2",
                next.yours ? "font-medium text-fg" : "text-fg-muted",
              )}
            >
              {next.yours ? (
                <span
                  aria-hidden="true"
                  className="inline-block size-1.5 shrink-0 rounded-full bg-signal"
                />
              ) : null}
              {next.label}
            </span>
            <Icon
              icon={ChevronDown}
              size={16}
              className="text-fg-muted transition-transform duration-150 group-open/next:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="t-body-s flex flex-col gap-2 border-t border-line px-4 py-3 text-fg-muted md:px-5">
            <p>{next.text}</p>
            <Link
              href={href}
              {...navForward}
              className="inline-flex items-center gap-2 self-start font-medium text-fg underline-offset-4 hover:underline"
            >
              {next.open}
              <Icon icon={ArrowRight} size={16} />
            </Link>
          </div>
        </details>
      ) : null}
    </article>
  );
}
